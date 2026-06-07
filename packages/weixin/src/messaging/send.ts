/**
 * 微信消息发送
 * v1 仅支持文本消息发送
 */
import type { WeixinApiOptions } from '../api/client';
import { getConfig, sendMessage as sendMessageApi, sendTyping as sendTypingApi } from '../api/endpoints';
import type { MessageItem, SendMessageReq } from '../types/protocol';
import { MessageItemType, MessageState, MessageType, TypingStatus } from '../types/protocol';
import { logger } from '../utils/logger';
import { generateId } from '../utils/random';
import { StreamingMarkdownFilter } from './markdown-filter';

// 重导出共享 getToolLabel 供外部使用
export { getToolLabel } from '@oagent/channels';

export type WeixinMessageSendOptions = WeixinApiOptions & {
    contextToken?: string;
    runId?: string;
    /** 跳过 Markdown 过滤（调用方已预处理） */
    skipFilter?: boolean;
};

function generateClientId(): string {
    return generateId('weixin');
}

/** 构建文本消息请求 */
function buildTextMessageReq(params: { to: string; text: string; contextToken?: string; runId?: string; clientId: string }): SendMessageReq {
    const { to, text, contextToken, runId, clientId } = params;
    const item_list: MessageItem[] = text ? [{ type: MessageItemType.TEXT, text_item: { text } }] : [];
    return {
        msg: {
            from_user_id: '',
            to_user_id: to,
            client_id: clientId,
            message_type: MessageType.BOT,
            message_state: MessageState.FINISH,
            item_list: item_list.length ? item_list : undefined,
            context_token: contextToken ?? undefined,
            run_id: runId ?? undefined
        }
    };
}

/**
 * 发送纯文本消息
 */
export async function sendMessageWeixin(params: { to: string; text: string; opts: WeixinMessageSendOptions }): Promise<{ messageId: string }> {
    const { to, text, opts } = params;
    if (!opts.contextToken) {
        logger.warn(`sendMessageWeixin: contextToken missing for to=${to}, sending without context`);
    }

    // 应用 Markdown 过滤（除非调用方已预处理）
    const filteredText = opts.skipFilter
        ? text
        : (() => {
              const filter = new StreamingMarkdownFilter();
              return filter.feed(text) + filter.flush();
          })();

    const clientId = generateClientId();
    const req = buildTextMessageReq({
        to,
        text: filteredText,
        contextToken: opts.contextToken,
        runId: opts.runId,
        clientId
    });
    try {
        await sendMessageApi({
            baseUrl: opts.baseUrl,
            token: opts.token,
            timeoutMs: opts.timeoutMs,
            body: req
        });
    } catch (err) {
        logger.error(`sendMessageWeixin: failed to=${to} clientId=${clientId} err=${String(err)}`);
        throw err;
    }
    return { messageId: clientId };
}

// ---------------------------------------------------------------------------
// Typing 指示器
// ---------------------------------------------------------------------------

const TYPING_INTERVAL_MS = 4_000;

/**
 * 对指定用户启动 typing 指示器
 * 返回 stop 函数，调用后停止发送 typing 状态
 */
export async function startTypingIndicator(params: { baseUrl: string; token: string; userId: string; contextToken?: string; abortSignal?: AbortSignal }): Promise<() => void> {
    let active = true;

    // 获取 typing_ticket
    let typingTicket: string | undefined;
    try {
        const resp = await getConfig({
            baseUrl: params.baseUrl,
            token: params.token,
            ilinkUserId: params.userId,
            contextToken: params.contextToken
        });
        typingTicket = resp.typing_ticket;
    } catch {
        // typing 指示器是尽力而为的
        return () => {};
    }

    if (!typingTicket) return () => {};

    const stop = () => {
        active = false;
        clearInterval(interval);
    };

    // 监听 abortSignal 以支持协作式取消
    params.abortSignal?.addEventListener('abort', stop, { once: true });

    const send = async () => {
        if (!active) return;
        try {
            await sendTypingApi({
                baseUrl: params.baseUrl,
                token: params.token,
                body: {
                    ilink_user_id: params.userId,
                    typing_ticket: typingTicket,
                    status: TypingStatus.TYPING
                }
            });
        } catch {
            // ignore
        }
    };

    // 立即发送一次（不阻塞调用方）
    void send();
    // 定时续期
    const interval = setInterval(send, TYPING_INTERVAL_MS);

    return stop;
}
