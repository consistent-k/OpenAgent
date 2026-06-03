/**
 * 单条消息处理：追加到会话 → 调用 AI → 收集回复 → 发送
 */
import { SessionManager } from '@oagent/channels';
import type { ModelMessage } from 'ai';
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
    // Telegram 消息长度限制 4096 字符
    const MAX_LENGTH = 4096;

    if (text.length <= MAX_LENGTH) {
        await client.post('/sendMessage', {
            chat_id: chatId,
            text,
            parse_mode: 'Markdown'
        });
    } else {
        // 分段发送
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

// ---------------------------------------------------------------------------
// Typing 指示器
// ---------------------------------------------------------------------------

const TYPING_INTERVAL_MS = 4_000;

function startTypingIndicator(client: AxiosInstance, chatId: string, abortSignal?: AbortSignal): () => void {
    let active = true;

    const stop = () => {
        active = false;
        clearInterval(interval);
    };

    abortSignal?.addEventListener('abort', stop, { once: true });

    // 立即发送一次
    void sendChatAction(client, chatId);
    // 定时续期
    const interval = setInterval(() => {
        if (active) void sendChatAction(client, chatId);
    }, TYPING_INTERVAL_MS);

    return stop;
}

// ---------------------------------------------------------------------------
// 工具名称 → 中文标签映射
// ---------------------------------------------------------------------------

const TOOL_LABELS: Record<string, string> = {
    read_file: '阅读文件',
    write_file: '写入文件',
    edit_file: '编辑文件',
    execute_bash: '执行命令',
    grep: '搜索代码',
    glob: '搜索文件',
    fetch: '访问网页',
    read_directory: '浏览目录',
    web_search: '搜索网络',
    ask_user_question: '询问用户'
};

export function getToolLabel(toolName: string): string {
    return TOOL_LABELS[toolName] || toolName;
}

// ---------------------------------------------------------------------------
// 主处理函数
// ---------------------------------------------------------------------------

/**
 * 处理单条消息：追加到会话 → 调用 AI → 收集回复 → 发送
 */
export async function processMessage(params: ProcessMessageParams): Promise<void> {
    const { userId, text, sessionManager, client, abortSignal, onMessage, runAgent } = params;

    // 追加用户消息到会话
    sessionManager.appendUserMessage(userId, text);

    // 通知宿主进程
    onMessage?.({ type: 'inbound', userId, text });

    // 构建消息数组（过滤 system 消息）
    const history = sessionManager.getHistory(userId);
    const messages: ModelMessage[] = history.filter((m) => m.role !== 'system');

    logger.info(`Calling AI for user=${userId}, messages=${messages.length}, text="${text.slice(0, 50)}${text.length > 50 ? '…' : ''}"`);

    // 启动 typing 指示器
    const stopTyping = startTypingIndicator(client, userId, abortSignal);

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
                // 发送工具使用提示
                void sendTelegramMessage(client, userId, `🔧 正在使用工具: ${getToolLabel(toolName)}...`).catch((err) => logger.error(`Failed to send tool notification to=${userId}: ${String(err)}`));
            } else if (chunk.type === 'reasoning-start') {
                logger.info(`Reasoning started for user=${userId}`);
                void sendTelegramMessage(client, userId, '🤔 正在思考...').catch((err) => logger.error(`Failed to send reasoning notification to=${userId}: ${String(err)}`));
            }
        }
        logger.info(`Stream completed for user=${userId}, length=${replyText.length}`);

        if (!replyText.trim()) {
            logger.warn(`Empty AI reply for user=${userId}, skipping send`);
            sessionManager.appendAssistantMessage(userId, replyText);
            return;
        }

        // 追加 AI 回复到会话
        sessionManager.appendAssistantMessage(userId, replyText);

        // 发送回复
        logger.info(`Sending reply to=${userId}, len=${replyText.length}, preview="${replyText.slice(0, 60)}${replyText.length > 60 ? '…' : ''}"`);

        await sendTelegramMessage(client, userId, replyText);

        logger.info(`Reply sent successfully to=${userId}`);

        // 通知宿主进程
        onMessage?.({ type: 'reply', userId, text: replyText });
    } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.error(`AI processing failed for user=${userId}: ${errMsg}`);
        onMessage?.({ type: 'error', userId, text: errMsg });

        // 截断过长的错误信息
        const shortMsg = errMsg.length > 200 ? errMsg.slice(0, 200) + '...' : errMsg;
        const userMsg = `⚠️ 处理出错: ${shortMsg}`;

        // 发送错误提示
        try {
            await sendTelegramMessage(client, userId, userMsg);
        } catch (sendErr) {
            logger.error(`Failed to send error notice to=${userId}: ${String(sendErr)}`);
        }
    } finally {
        stopTyping();
    }
}
