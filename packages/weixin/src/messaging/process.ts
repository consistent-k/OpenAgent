/**
 * 单条消息处理 — 使用共享 processMessage + 微信 transport
 */
import { SessionManager, processMessage as processMessageShared, type MessageTransport } from '@oagent/channels';
import type { WeixinMessageEvent } from '../monitor/main';
import type { RunAgentFn } from '../types/plugin';
import { logger } from '../utils/logger';
import { StreamingMarkdownFilter } from './markdown-filter';
import { sendMessageWeixin, startTypingIndicator } from './send';

export type ProcessMessageParams = {
    userId: string;
    text: string;
    sessionManager: SessionManager;
    baseUrl: string;
    token: string;
    contextToken?: string;
    abortSignal?: AbortSignal;
    onMessage?: (event: WeixinMessageEvent) => void;
    runAgent: RunAgentFn;
};

/**
 * 处理单条消息（委托给共享实现）
 */
export async function processMessage(params: ProcessMessageParams): Promise<void> {
    const { userId, text, sessionManager, baseUrl, token, contextToken, abortSignal, onMessage, runAgent } = params;

    const transport: MessageTransport = {
        sendText: (uid, msg) => sendMessageWeixin({ to: uid, text: msg, opts: { baseUrl, token, contextToken, skipFilter: true } }).then(() => {}),
        sendNotification: (uid, msg) => {
            void sendMessageWeixin({ to: uid, text: msg, opts: { baseUrl, token, contextToken, skipFilter: true } }).catch((err) =>
                logger.error(`Failed to send notification to=${uid}: ${String(err)}`)
            );
        },
        startTyping: (uid, signal) => startTypingIndicator({ baseUrl, token, userId: uid, contextToken, abortSignal: signal })
    };

    const filterReply = (text: string) => {
        const filter = new StreamingMarkdownFilter();
        return filter.feed(text) + filter.flush();
    };

    await processMessageShared({
        userId,
        text,
        sessionManager,
        transport,
        abortSignal,
        onMessage,
        runAgent,
        logger,
        filterReply
    });
}
