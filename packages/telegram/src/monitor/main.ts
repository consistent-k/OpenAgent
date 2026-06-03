/**
 * Telegram 消息监控主循环
 * 核心逻辑：long polling 接收消息 → 调用 AI → 发送回复
 */
import { SessionManager } from '@oagent/channels';
import type { AxiosInstance } from 'axios';
import { processMessage } from '../messaging/process';
import type { RunAgentFn } from '../types/plugin';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------

const MAX_CONSECUTIVE_FAILURES = 3;
const BACKOFF_DELAY_MS = 30_000;
const RETRY_DELAY_MS = 2_000;
const LONG_POLL_TIMEOUT_S = 30;

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

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

export type TelegramMessageEvent = {
    type: 'inbound' | 'reply' | 'error';
    userId: string;
    text: string;
};

export type MonitorTelegramOpts = {
    client: AxiosInstance;
    abortSignal?: AbortSignal;
    /** 消息事件回调，用于 TUI 等宿主进程接收消息通知 */
    onMessage?: (event: TelegramMessageEvent) => void;
    /** AI Agent 调用函数 — 由宿主注入 */
    runAgent: RunAgentFn;
};

/** Telegram Update 对象（简化版） */
interface TelegramUpdate {
    update_id: number;
    message?: {
        message_id: number;
        from?: {
            id: number;
            is_bot: boolean;
            first_name?: string;
            username?: string;
        };
        chat: {
            id: number;
            type: string;
        };
        text?: string;
        date: number;
    };
}

/** Telegram API 响应 */
interface TelegramResponse<T> {
    ok: boolean;
    result: T;
    description?: string;
    error_code?: number;
}

// ---------------------------------------------------------------------------
// 主监控循环
// ---------------------------------------------------------------------------

/**
 * 启动 Telegram 消息监控
 * Long polling getUpdates → 处理消息 → 调用 runAgent → 发送回复
 */
export async function monitorTelegramProvider(opts: MonitorTelegramOpts): Promise<void> {
    const { client, abortSignal, onMessage, runAgent } = opts;

    // 验证 bot token
    try {
        const resp = await client.get<TelegramResponse<{ id: number; username?: string }>>('/getMe');
        if (resp.data.ok) {
            const bot = resp.data.result;
            logger.info(`Telegram monitor started (bot=@${bot.username ?? bot.id})`);
        } else {
            throw new Error(`getMe failed: ${resp.data.description}`);
        }
    } catch (err) {
        logger.error(`Failed to verify bot token: ${String(err)}`);
        throw new Error('Bot token 验证失败，请检查 token 是否正确');
    }

    // 会话管理器
    const sessionManager = new SessionManager();

    let offset = 0;
    let consecutiveFailures = 0;

    while (!abortSignal?.aborted) {
        try {
            logger.debug(`getUpdates: offset=${offset}, timeout=${LONG_POLL_TIMEOUT_S}s`);

            const resp = await client.get<TelegramResponse<TelegramUpdate[]>>('/getUpdates', {
                params: {
                    offset,
                    timeout: LONG_POLL_TIMEOUT_S,
                    allowed_updates: JSON.stringify(['message'])
                },
                timeout: (LONG_POLL_TIMEOUT_S + 10) * 1000,
                signal: abortSignal
            });

            if (!resp.data.ok) {
                // Telegram API 错误
                consecutiveFailures++;
                logger.error(`getUpdates failed: ${resp.data.description} (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES})`);

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

            const updates = resp.data.result;
            for (const update of updates) {
                // 更新 offset，确保下次不再收到此消息
                offset = update.update_id + 1;

                const msg = update.message;
                if (!msg?.text) continue;

                // 忽略 bot 自身的消息
                if (msg.from?.is_bot) continue;

                const chatId = String(msg.chat.id);
                const text = msg.text;

                logger.info(`Inbound message: chatId=${chatId} text="${text.slice(0, 50)}${text.length > 50 ? '…' : ''}"`);

                // 处理消息（同步处理，与 weixin 一致）
                await processMessage({
                    userId: chatId,
                    text,
                    sessionManager,
                    client,
                    abortSignal,
                    onMessage,
                    runAgent
                }).catch((err) => {
                    logger.error(`processMessage error for ${chatId}: ${String(err)}`);
                });
            }
        } catch (err) {
            if (abortSignal?.aborted) {
                logger.info('Monitor stopped (aborted)');
                return;
            }

            // 忽略 axios 取消错误
            if (err instanceof Error && err.name === 'CanceledError') {
                continue;
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
}
