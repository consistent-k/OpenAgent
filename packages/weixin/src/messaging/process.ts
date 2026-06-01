/**
 * 单条消息处理：追加到会话 → 调用 AI → 收集回复 → 发送
 */
import { SessionManager } from '@oagent/channels';
import type { ModelMessage } from 'ai';
import type { WeixinMessageEvent } from '../monitor/main';
import type { RunAgentFn } from '../types/plugin';
import { logger } from '../utils/logger';
import { StreamingMarkdownFilter } from './markdown-filter';
import { sendMessageWeixin, startTypingIndicator, getToolLabel } from './send';

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
 * 处理单条消息：追加到会话 → 调用 AI → 收集回复 → 发送
 */
export async function processMessage(params: ProcessMessageParams): Promise<void> {
    const { userId, text, sessionManager, baseUrl, token, contextToken, abortSignal, onMessage, runAgent } = params;

    // 追加用户消息到会话
    sessionManager.appendUserMessage(userId, text);

    // 通知宿主进程
    onMessage?.({ type: 'inbound', userId, text });

    // 构建消息数组（过滤 system 消息）
    const history = sessionManager.getHistory(userId);
    const messages: ModelMessage[] = history.filter((m) => m.role !== 'system');

    logger.info(`Calling AI for user=${userId}, messages=${messages.length}, text="${text.slice(0, 50)}${text.length > 50 ? '…' : ''}"`);

    // 启动 typing 指示器
    const stopTyping = await startTypingIndicator({ baseUrl, token, userId, contextToken, abortSignal }).catch(() => () => {});

    try {
        // 调用 AI Agent（通过注入的函数，微信场景减少重试次数）
        logger.info(`Calling runAgent for user=${userId}`);
        const result = await runAgent(messages, abortSignal, { maxRetries: 3 });
        logger.info(`runAgent returned for user=${userId}, consuming stream`);

        // 通过 toUIMessageStream 消费流，同时收集文本和中间事件
        let replyText = '';
        const notifyUser = (msg: string) =>
            sendMessageWeixin({ to: userId, text: msg, opts: { baseUrl, token, contextToken, skipFilter: true } }).catch((err) =>
                logger.error(`Failed to send notification to=${userId}: ${String(err)}`)
            );
        const uiStream = result.toUIMessageStream();
        for await (const chunk of uiStream) {
            if (chunk.type === 'text-delta') {
                replyText += chunk.delta;
            } else if (chunk.type === 'tool-input-start') {
                const toolName = chunk.toolName as string;
                logger.info(`Tool call detected for user=${userId}: ${toolName}`);
                notifyUser(`🔧 正在使用工具: ${getToolLabel(toolName)}...`);
            } else if (chunk.type === 'reasoning-start') {
                logger.info(`Reasoning started for user=${userId}`);
                notifyUser('🤔 正在思考...');
            }
        }
        logger.info(`Stream completed for user=${userId}, length=${replyText.length}`);

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

        // 发送回复到微信（已预过滤，跳过 send 内部的重复过滤）
        logger.info(`Sending reply to=${userId}, len=${filteredReply.length}, preview="${filteredReply.slice(0, 60)}${filteredReply.length > 60 ? '…' : ''}"`);

        await sendMessageWeixin({
            to: userId,
            text: filteredReply,
            opts: {
                baseUrl,
                token,
                contextToken,
                skipFilter: true
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
    } finally {
        stopTyping();
    }
}
