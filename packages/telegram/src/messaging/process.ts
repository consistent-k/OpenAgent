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

/** 通过 Telegram Bot API 发送文本消息 */
async function sendTelegramMessage(client: AxiosInstance, chatId: string, text: string): Promise<void> {
    const MAX_LENGTH = 4096;

    if (text.length <= MAX_LENGTH) {
        await client.post('/sendMessage', {
            chat_id: chatId,
            text,
            parse_mode: 'Markdown'
        });
    } else {
        let remaining = text;
        while (remaining.length > 0) {
            const chunk = remaining.slice(0, MAX_LENGTH);
            remaining = remaining.slice(MAX_LENGTH);
            await client.post('/sendMessage', {
                chat_id: chatId,
                text: chunk,
                parse_mode: 'Markdown'
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
