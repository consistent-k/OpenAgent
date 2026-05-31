/**
 * 微信消息发送
 * 简化自 @tencent-weixin/openclaw-weixin/src/messaging/send.ts
 * v1 仅支持文本消息发送
 */
import { sendMessage as sendMessageApi } from './api.js';
import type { WeixinApiOptions } from './api.js';
import { logger } from './logger.js';
import { StreamingMarkdownFilter } from './markdown-filter.js';
import { generateId } from './random.js';
import type { MessageItem, SendMessageReq } from './types.js';
import { MessageItemType, MessageState, MessageType } from './types.js';

export type WeixinMessageSendOptions = WeixinApiOptions & {
    contextToken?: string;
    runId?: string;
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

    // 应用 Markdown 过滤
    const filter = new StreamingMarkdownFilter();
    const filteredText = filter.feed(text) + filter.flush();

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
