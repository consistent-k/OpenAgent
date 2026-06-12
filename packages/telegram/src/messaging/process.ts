/**
 * 单条消息处理 — 使用共享 processMessage + Telegram transport
 */
import { SessionManager, processMessage as processMessageShared, type MessageTransport } from '@oagent/channels';
import type { AxiosInstance } from 'axios';
import type { TelegramMessageEvent } from '../monitor/main';
import type { RunAgentFn } from '../types/plugin';
import { logger } from '../utils/logger';

export type ProcessMessageParams = {
    userId: string;
    text: string;
    sessionManager: SessionManager;
    client: AxiosInstance;
    abortSignal?: AbortSignal;
    onMessage?: (event: TelegramMessageEvent) => void;
    runAgent: RunAgentFn;
};

/** 将 Markdown 转换为 Telegram HTML 格式 */
function markdownToTelegramHtml(md: string): string {
    let html = md
        // 代码块（必须在行内样式之前处理）
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
        // 行内代码
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // 粗体
        .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
        // 斜体
        .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<i>$1</i>')
        // 删除线
        .replace(/~~([^~]+)~~/g, '<s>$1</s>')
        // 链接
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // 转义 HTML 特殊字符（但保留已插入的标签）
    // 先保护已插入的标签
    const tags: string[] = [];
    html = html.replace(/<\/?[a-z][^>]*>/gi, (tag) => {
        tags.push(tag);
        return `\x00${tags.length - 1}\x00`;
    });
    // 转义剩余的 HTML 特殊字符
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // 恢复标签
    html = html.replace(/\x00(\d+)\x00/g, (_, i) => tags[parseInt(i)] ?? '');

    return html;
}

/** 通过 Telegram Bot API 发送文本消息 */
async function sendTelegramMessage(client: AxiosInstance, chatId: string, text: string): Promise<void> {
    const MAX_LENGTH = 4096;
    const htmlText = markdownToTelegramHtml(text);

    if (htmlText.length <= MAX_LENGTH) {
        await client
            .post('/sendMessage', {
                chat_id: chatId,
                text: htmlText,
                parse_mode: 'HTML'
            })
            .catch(async (err) => {
                // HTML 解析失败时降级为纯文本
                if (err?.response?.data?.description?.includes("can't parse entities")) {
                    await client.post('/sendMessage', { chat_id: chatId, text });
                } else {
                    throw err;
                }
            });
    } else {
        let remaining = htmlText;
        while (remaining.length > 0) {
            const chunk = remaining.slice(0, MAX_LENGTH);
            remaining = remaining.slice(MAX_LENGTH);
            await client
                .post('/sendMessage', {
                    chat_id: chatId,
                    text: chunk,
                    parse_mode: 'HTML'
                })
                .catch(async (err) => {
                    if (err?.response?.data?.description?.includes("can't parse entities")) {
                        await client.post('/sendMessage', { chat_id: chatId, text: chunk });
                    } else {
                        throw err;
                    }
                });
        }
    }
}

/** 发送 ChatAction（typing 状态） */
async function sendChatAction(client: AxiosInstance, chatId: string): Promise<void> {
    try {
        await client.post('/sendChatAction', {
            chat_id: chatId,
            action: 'typing'
        });
    } catch {
        // 尽力而为，忽略错误
    }
}

const TYPING_INTERVAL_MS = 4_000;

function startTypingIndicator(client: AxiosInstance, chatId: string, abortSignal?: AbortSignal): () => void {
    let active = true;

    const stop = () => {
        active = false;
        clearInterval(interval);
    };

    abortSignal?.addEventListener('abort', stop, { once: true });

    void sendChatAction(client, chatId);
    const interval = setInterval(() => {
        if (active) void sendChatAction(client, chatId);
    }, TYPING_INTERVAL_MS);

    return stop;
}

/**
 * 处理单条消息（委托给共享实现）
 */
export async function processMessage(params: ProcessMessageParams): Promise<void> {
    const { userId, text, sessionManager, client, abortSignal, onMessage, runAgent } = params;

    const transport: MessageTransport = {
        sendText: (uid, msg) => sendTelegramMessage(client, uid, msg),
        sendNotification: (uid, msg) => {
            void sendTelegramMessage(client, uid, msg).catch((err) => logger.error(`Failed to send notification to=${uid}: ${String(err)}`));
        },
        startTyping: (uid, signal) => startTypingIndicator(client, uid, signal)
    };

    await processMessageShared({
        userId,
        text,
        sessionManager,
        transport,
        abortSignal,
        onMessage,
        runAgent,
        logger
    });
}
