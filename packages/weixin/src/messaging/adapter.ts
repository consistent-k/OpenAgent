/**
 * 消息格式适配器
 * 将微信消息转换为 OpenAgent 的 ModelMessage 格式
 */
import type { WeixinMessage, MessageItem } from '../types/protocol';
import { MessageItemType } from '../types/protocol';
import { logger } from '../utils/logger';

/** 从 item_list 提取文本内容 */
export function extractTextFromItemList(items?: MessageItem[]): string {
    if (!items?.length) return '';

    for (const item of items) {
        // 文本消息
        if (item.type === MessageItemType.TEXT && item.text_item?.text != null) {
            let text = String(item.text_item.text);

            // 处理引用消息
            if (item.ref_msg?.message_item) {
                const refItem = item.ref_msg.message_item;
                let refText = '';
                if (refItem.type === MessageItemType.TEXT && refItem.text_item?.text) {
                    refText = refItem.text_item.text;
                } else if (refItem.type === MessageItemType.VOICE && refItem.voice_item?.text) {
                    refText = refItem.voice_item.text;
                }
                if (refText) {
                    const truncated = refText.length > 100 ? refText.slice(0, 100) + '…' : refText;
                    text = `[引用: ${truncated}]\n${text}`;
                }
            }

            return text;
        }

        // 语音消息（语音转文字结果）
        if (item.type === MessageItemType.VOICE && item.voice_item?.text) {
            return String(item.voice_item.text);
        }
    }

    return '';
}

/** 检查消息是否包含可下载的媒体 */
function hasMediaContent(items?: MessageItem[]): boolean {
    if (!items?.length) return false;
    return items.some((item) => item.type === MessageItemType.IMAGE || item.type === MessageItemType.VIDEO || item.type === MessageItemType.FILE);
}

/** 适配结果 */
export type AdaptedMessage = {
    text: string;
    userId: string;
    hasMedia: boolean;
};

/**
 * 将微信消息转换为可处理的格式
 * 返回 null 表示消息应被跳过
 */
export function adaptWeixinMessage(msg: WeixinMessage): AdaptedMessage | null {
    const userId = msg.from_user_id?.trim();
    if (!userId) {
        logger.warn('adaptWeixinMessage: missing from_user_id, skipping');
        return null;
    }

    const text = extractTextFromItemList(msg.item_list);
    const hasMedia = hasMediaContent(msg.item_list);

    if (!text && !hasMedia) {
        logger.debug(`adaptWeixinMessage: empty message from ${userId}, skipping`);
        return null;
    }

    // v1: 仅处理文本，媒体消息附带提示
    let finalText = text;
    if (!text && hasMedia) {
        finalText = '[用户发送了媒体文件，当前版本暂不支持处理]';
        logger.info(`adaptWeixinMessage: media-only message from ${userId}, sending placeholder`);
    }

    return {
        text: finalText,
        userId,
        hasMedia
    };
}
