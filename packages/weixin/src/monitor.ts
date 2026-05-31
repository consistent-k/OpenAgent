/**
 * 微信消息监控主循环
 * 核心逻辑：长轮询接收消息 → 适配 → 调用 AI → 发送回复
 *
 * 通过依赖注入接收 runAgent，解耦宿主应用
 */
import { SessionManager } from '@oagent/channels';
import type { ModelMessage } from 'ai';
import { adaptWeixinMessage } from './adapter.js';
import { getUpdates, notifyStart, notifyStop } from './api.js';
import { getContextToken, setContextToken, restoreContextTokens } from './context-token.js';
import { logger } from './logger.js';
import { StreamingMarkdownFilter } from './markdown-filter.js';
import type { RunAgentFn, EnableAutoApproveFn } from './plugin-types.js';
import { sendMessageWeixin } from './send.js';
import { getSyncBufFilePath, loadGetUpdatesBuf, saveGetUpdatesBuf } from './sync-buf.js';

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------

const DEFAULT_LONG_POLL_TIMEOUT_MS = 35_000;
const MAX_CONSECUTIVE_FAILURES = 3;
const BACKOFF_DELAY_MS = 30_000;
const RETRY_DELAY_MS = 2_000;
const SESSION_EXPIRED_ERRCODE = -14;

// ---------------------------------------------------------------------------
// 辅助函数
// ---------------------------------------------------------------------------

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        const t = setTimeout(resolve, ms);
        signal?.addEventListener(
            'abort',
            () => {
                clearTimeout(t);
                reject(new Error('aborted'));
            },
            { once: true }
        );
    });
}

/** 会话过期暂停时间（毫秒） */
const SESSION_PAUSE_MS = 5 * 60_000;

/** 检查是否为会话过期错误 */
function isSessionExpired(resp: { ret?: number; errcode?: number }): boolean {
    return resp.errcode === SESSION_EXPIRED_ERRCODE || resp.ret === SESSION_EXPIRED_ERRCODE;
}

// ---------------------------------------------------------------------------
// 监控配置
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
    /** 工具自动审批函数 — 由宿主注入 */
    enableAutoApprove?: EnableAutoApproveFn;
};

// ---------------------------------------------------------------------------
// 主监控循环
// ---------------------------------------------------------------------------

/**
 * 启动微信消息监控
 * 长轮询 getUpdates → 适配消息 → 调用 runAgent → 发送回复
 */
export async function monitorWeixinProvider(opts: MonitorWeixinOpts): Promise<void> {
    const { baseUrl, token, accountId, abortSignal, longPollTimeoutMs, onMessage, runAgent, enableAutoApprove } = opts;

    logger.info(`Weixin monitor started (baseUrl=${baseUrl}, account=${accountId})`);

    // 启用自动审批
    if (enableAutoApprove) {
        enableAutoApprove().catch((err) => logger.warn(`Failed to enable auto-approve: ${String(err)}`));
    }

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

            // 处理消息
            const list = resp.msgs ?? [];
            for (const msg of list) {
                const fromUser = msg.from_user_id ?? 'unknown';
                logger.info(`Inbound message: from=${fromUser} types=${msg.item_list?.map((i) => i.type).join(',') ?? 'none'}`);

                const adapted = adaptWeixinMessage(msg);
                if (!adapted) continue;

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
                    accountId,
                    contextToken: msg.context_token ?? contextToken,
                    abortSignal,
                    onMessage,
                    runAgent
                }).catch((err) => {
                    logger.error(`processMessage error for ${adapted.userId}: ${String(err)}`);
                });
            }
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

// ---------------------------------------------------------------------------
// 单条消息处理
// ---------------------------------------------------------------------------

type ProcessMessageParams = {
    userId: string;
    text: string;
    sessionManager: SessionManager;
    baseUrl: string;
    token: string;
    accountId: string;
    contextToken?: string;
    abortSignal?: AbortSignal;
    onMessage?: (event: WeixinMessageEvent) => void;
    runAgent: RunAgentFn;
};

/**
 * 处理单条消息：追加到会话 → 调用 AI → 收集回复 → 发送
 */
async function processMessage(params: ProcessMessageParams): Promise<void> {
    const { userId, text, sessionManager, baseUrl, token, contextToken, abortSignal, onMessage, runAgent } = params;

    // 追加用户消息到会话
    sessionManager.appendUserMessage(userId, text);

    // 通知宿主进程
    onMessage?.({ type: 'inbound', userId, text });

    // 构建消息数组（过滤 system 消息）
    const history = sessionManager.getHistory(userId);
    const messages: ModelMessage[] = history.filter((m) => m.role !== 'system');

    logger.info(`Calling AI for user=${userId}, messages=${messages.length}, text="${text.slice(0, 50)}${text.length > 50 ? '…' : ''}"`);

    try {
        // 调用 AI Agent（通过注入的函数，微信场景减少重试次数）
        logger.info(`Calling runAgent for user=${userId}`);
        const result = await runAgent(messages, abortSignal, { maxRetries: 3 });
        logger.info(`runAgent returned for user=${userId}, starting stream`);

        // 收集流式文本
        let replyText = '';
        let chunkCount = 0;
        for await (const chunk of result.textStream) {
            replyText += chunk;
            chunkCount++;
        }
        logger.info(`Stream completed for user=${userId}, chunks=${chunkCount}, length=${replyText.length}`);

        // 应用 Markdown 过滤
        const filter = new StreamingMarkdownFilter();
        const filteredReply = filter.feed(replyText) + filter.flush();

        if (!filteredReply.trim()) {
            logger.warn(`Empty AI reply for user=${userId}, skipping send`);
            // 不发送空回复，但仍然追加到会话历史
            sessionManager.appendAssistantMessage(userId, replyText);
            return;
        }

        // 追加 AI 回复到会话
        sessionManager.appendAssistantMessage(userId, replyText);

        // 发送回复到微信
        logger.info(`Sending reply to=${userId}, len=${filteredReply.length}, preview="${filteredReply.slice(0, 60)}${filteredReply.length > 60 ? '…' : ''}"`);

        await sendMessageWeixin({
            to: userId,
            text: filteredReply,
            opts: {
                baseUrl,
                token,
                contextToken
            }
        });

        logger.info(`Reply sent successfully to=${userId}`);

        // 通知宿主进程
        onMessage?.({ type: 'reply', userId, text: filteredReply });
    } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.error(`AI processing failed for user=${userId}: ${errMsg}`);
        onMessage?.({ type: 'error', userId, text: errMsg });

        // 截断过长的错误信息，保留关键部分
        const shortMsg = errMsg.length > 200 ? errMsg.slice(0, 200) + '...' : errMsg;
        const userMsg = `⚠️ 处理出错: ${shortMsg}`;

        // 发送错误提示给微信用户
        try {
            await sendMessageWeixin({
                to: userId,
                text: userMsg,
                opts: { baseUrl, token, contextToken }
            });
        } catch (sendErr) {
            logger.error(`Failed to send error notice to=${userId}: ${String(sendErr)}`);
        }
    }
}
