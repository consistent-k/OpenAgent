/**
 * 微信消息监控主循环
 * 核心逻辑：长轮询接收消息 → 适配 → 调用 AI → 发送回复
 */
import { SessionManager, sleep } from '@oagent/channels';
import { getUpdates, notifyStart, notifyStop, DEFAULT_LONG_POLL_TIMEOUT_MS } from '../api/endpoints';
import { adaptWeixinMessage } from '../messaging/adapter';
import { processMessage } from '../messaging/process';
import { getContextToken, setContextToken, restoreContextTokens } from '../storage/context-token';
import { getSyncBufFilePath, loadGetUpdatesBuf, saveGetUpdatesBuf } from '../storage/sync-buf';
import type { RunAgentFn } from '../types/plugin';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------

const MAX_CONSECUTIVE_FAILURES = 3;
const BACKOFF_DELAY_MS = 30_000;
const RETRY_DELAY_MS = 2_000;
const SESSION_EXPIRED_ERRCODE = -14;
const SESSION_PAUSE_MS = 5 * 60_000;

// ---------------------------------------------------------------------------
// 辅助函数
// ---------------------------------------------------------------------------

/** 检查是否为会话过期错误 */
function isSessionExpired(resp: { ret?: number; errcode?: number }): boolean {
    return resp.errcode === SESSION_EXPIRED_ERRCODE || resp.ret === SESSION_EXPIRED_ERRCODE;
}

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

export type WeixinMessageEvent = {
    type: 'inbound' | 'reply' | 'error';
    userId: string;
    text: string;
};

export type MonitorWeixinOpts = {
    baseUrl: string;
    token: string;
    accountId: string;
    abortSignal?: AbortSignal;
    longPollTimeoutMs?: number;
    /** 消息事件回调，用于 TUI 等宿主进程接收消息通知 */
    onMessage?: (event: WeixinMessageEvent) => void;
    /** AI Agent 调用函数 — 由宿主注入 */
    runAgent: RunAgentFn;
};

// ---------------------------------------------------------------------------
// 主监控循环
// ---------------------------------------------------------------------------

/**
 * 启动微信消息监控
 * 长轮询 getUpdates → 适配消息 → 调用 runAgent → 发送回复
 */
export async function monitorWeixinProvider(opts: MonitorWeixinOpts): Promise<void> {
    const { baseUrl, token, accountId, abortSignal, longPollTimeoutMs, onMessage, runAgent } = opts;

    logger.info(`Weixin monitor started (baseUrl=${baseUrl}, account=${accountId})`);

    // 通知服务端启动
    try {
        const resp = await notifyStart({ baseUrl, token });
        if (resp.ret !== undefined && resp.ret !== 0) {
            logger.warn(`notifyStart: ret=${resp.ret} errmsg=${resp.errmsg ?? ''}`);
        }
    } catch (err) {
        logger.warn(`notifyStart failed (ignored): ${String(err)}`);
    }

    // 恢复 contextToken
    restoreContextTokens(accountId);

    // 加载游标
    const syncFilePath = getSyncBufFilePath(accountId);
    const previousBuf = loadGetUpdatesBuf(syncFilePath);
    let getUpdatesBuf = previousBuf ?? '';

    if (previousBuf) {
        logger.info(`Resuming from previous sync buf (${getUpdatesBuf.length} bytes)`);
    } else {
        logger.info('No previous sync buf, starting fresh');
    }

    // 会话管理器
    const sessionManager = new SessionManager();

    let nextTimeoutMs = longPollTimeoutMs ?? DEFAULT_LONG_POLL_TIMEOUT_MS;
    let consecutiveFailures = 0;

    while (!abortSignal?.aborted) {
        try {
            logger.debug(`getUpdates: buf=${getUpdatesBuf.substring(0, 50)}..., timeout=${nextTimeoutMs}ms`);

            const resp = await getUpdates({
                baseUrl,
                token,
                get_updates_buf: getUpdatesBuf,
                timeoutMs: nextTimeoutMs,
                abortSignal
            });

            logger.debug(`getUpdates response: ret=${resp.ret}, msgs=${resp.msgs?.length ?? 0}`);

            // 更新超时
            if (resp.longpolling_timeout_ms != null && resp.longpolling_timeout_ms > 0) {
                nextTimeoutMs = resp.longpolling_timeout_ms;
            }

            // 检查 API 错误
            const isApiError = (resp.ret !== undefined && resp.ret !== 0) || (resp.errcode !== undefined && resp.errcode !== 0);

            if (isApiError) {
                if (isSessionExpired(resp)) {
                    logger.error(`Session expired (errcode=${SESSION_EXPIRED_ERRCODE}), pausing ${Math.ceil(SESSION_PAUSE_MS / 60_000)} min`);
                    consecutiveFailures = 0;
                    await sleep(SESSION_PAUSE_MS, abortSignal);
                    continue;
                }

                consecutiveFailures++;
                logger.error(`getUpdates failed: ret=${resp.ret} errcode=${resp.errcode} errmsg=${resp.errmsg ?? ''} (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES})`);

                if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                    logger.error(`${MAX_CONSECUTIVE_FAILURES} consecutive failures, backing off 30s`);
                    consecutiveFailures = 0;
                    await sleep(BACKOFF_DELAY_MS, abortSignal);
                } else {
                    await sleep(RETRY_DELAY_MS, abortSignal);
                }
                continue;
            }

            consecutiveFailures = 0;

            // 保存游标
            if (resp.get_updates_buf != null && resp.get_updates_buf !== '') {
                saveGetUpdatesBuf(syncFilePath, resp.get_updates_buf);
                getUpdatesBuf = resp.get_updates_buf;
            }

            // 处理消息（并行处理，不阻塞轮询）
            const list = resp.msgs ?? [];
            const processPromises = list.map(async (msg) => {
                const fromUser = msg.from_user_id ?? 'unknown';
                logger.info(`Inbound message: from=${fromUser} types=${msg.item_list?.map((i) => i.type).join(',') ?? 'none'}`);

                const adapted = adaptWeixinMessage(msg);
                if (!adapted) return;

                const contextToken = getContextToken(accountId, adapted.userId);

                // 保存 contextToken
                if (msg.context_token) {
                    setContextToken(accountId, adapted.userId, msg.context_token);
                }

                // 处理消息（异步，不阻塞轮询）
                await processMessage({
                    userId: adapted.userId,
                    text: adapted.text,
                    sessionManager,
                    baseUrl,
                    token,
                    contextToken: msg.context_token ?? contextToken,
                    abortSignal,
                    onMessage,
                    runAgent
                }).catch((err) => {
                    logger.error(`processMessage error for ${adapted.userId}: ${String(err)}`);
                });
            });
            // 等待所有消息处理完成（但不阻塞下一轮轮询）
            await Promise.allSettled(processPromises);
        } catch (err) {
            if (abortSignal?.aborted) {
                logger.info('Monitor stopped (aborted)');
                return;
            }
            consecutiveFailures++;
            logger.error(`getUpdates error (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}): ${String(err)}`);

            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                logger.error(`${MAX_CONSECUTIVE_FAILURES} consecutive failures, backing off 30s`);
                consecutiveFailures = 0;
                await sleep(BACKOFF_DELAY_MS, abortSignal);
            } else {
                await sleep(RETRY_DELAY_MS, abortSignal);
            }
        }
    }

    logger.info('Monitor ended');

    // 通知服务端停止
    try {
        await notifyStop({ baseUrl, token });
    } catch (err) {
        logger.warn(`notifyStop failed (ignored): ${String(err)}`);
    }
}
