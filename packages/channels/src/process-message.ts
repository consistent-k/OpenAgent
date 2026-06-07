/**
 * 通用消息处理流程（共享）
 * 追加到会话 → 调用 AI → 消费流 → 收集回复 → 发送
 */
import type { ModelMessage } from 'ai';
import type { ChannelLogger } from './logger';
import type { SessionManager } from './session';
import { getToolLabel } from './tool-labels';
import type { MessageTransport, RunAgentFn } from './types';

export interface ProcessMessageParams {
    userId: string;
    text: string;
    sessionManager: SessionManager;
    transport: MessageTransport;
    abortSignal?: AbortSignal;
    onMessage?: (event: { type: 'inbound' | 'reply' | 'error'; userId: string; text: string }) => void;
    runAgent: RunAgentFn;
    logger: ChannelLogger;
    /** 对回复文本做后处理（如微信的 markdown 过滤），默认 identity */
    filterReply?: (text: string) => string;
}

/**
 * 处理单条消息：追加到会话 → 调用 AI → 收集回复 → 发送
 */
export async function processMessage(params: ProcessMessageParams): Promise<void> {
    const { userId, text, sessionManager, transport, abortSignal, onMessage, runAgent, logger, filterReply } = params;

    // 追加用户消息到会话
    sessionManager.appendUserMessage(userId, text);

    // 通知宿主进程
    onMessage?.({ type: 'inbound', userId, text });

    // 构建消息数组（过滤 system 消息）
    const history = sessionManager.getHistory(userId);
    const messages: ModelMessage[] = history.filter((m) => m.role !== 'system');

    logger.info(`Calling AI for user=${userId}, messages=${messages.length}, text="${text.slice(0, 50)}${text.length > 50 ? '…' : ''}"`);

    // 启动 typing 指示器
    const stopTyping = await Promise.resolve(transport.startTyping(userId, abortSignal)).catch(() => () => {});

    try {
        // 调用 AI Agent
        logger.info(`Calling runAgent for user=${userId}`);
        const result = await runAgent(messages, abortSignal, { maxRetries: 3 });
        logger.info(`runAgent returned for user=${userId}, consuming stream`);

        // 消费流，收集文本
        let replyText = '';
        const uiStream = result.toUIMessageStream();
        for await (const chunk of uiStream) {
            if (chunk.type === 'text-delta') {
                replyText += chunk.delta;
            } else if (chunk.type === 'tool-input-start') {
                const toolName = chunk.toolName as string;
                logger.info(`Tool call detected for user=${userId}: ${toolName}`);
                transport.sendNotification(userId, `🔧 正在使用工具: ${getToolLabel(toolName)}...`);
            } else if (chunk.type === 'reasoning-start') {
                logger.info(`Reasoning started for user=${userId}`);
                transport.sendNotification(userId, '🤔 正在思考...');
            }
        }
        logger.info(`Stream completed for user=${userId}, length=${replyText.length}`);

        // 后处理（如 markdown 过滤）
        const filteredReply = filterReply ? filterReply(replyText) : replyText;

        if (!filteredReply.trim()) {
            logger.warn(`Empty AI reply for user=${userId}, skipping send`);
            sessionManager.appendAssistantMessage(userId, replyText);
            return;
        }

        // 追加 AI 回复到会话
        sessionManager.appendAssistantMessage(userId, replyText);

        // 发送回复
        logger.info(`Sending reply to=${userId}, len=${filteredReply.length}, preview="${filteredReply.slice(0, 60)}${filteredReply.length > 60 ? '…' : ''}"`);

        await transport.sendText(userId, filteredReply);

        logger.info(`Reply sent successfully to=${userId}`);

        // 通知宿主进程
        onMessage?.({ type: 'reply', userId, text: filteredReply });
    } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.error(`AI processing failed for user=${userId}: ${errMsg}`);
        onMessage?.({ type: 'error', userId, text: errMsg });

        // 截断过长的错误信息
        const shortMsg = errMsg.length > 200 ? errMsg.slice(0, 200) + '...' : errMsg;
        const userMsg = `⚠️ 处理出错: ${shortMsg}`;

        // 发送错误提示
        try {
            await transport.sendText(userId, userMsg);
        } catch (sendErr) {
            logger.error(`Failed to send error notice to=${userId}: ${String(sendErr)}`);
        }
    } finally {
        stopTyping();
    }
}
