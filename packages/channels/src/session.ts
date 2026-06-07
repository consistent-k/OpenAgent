/**
 * 共享会话管理
 * 维护每个用户与 AI 的对话历史，所有 channel 共用
 */
import type { ModelMessage } from 'ai';

/** 每个用户最大历史消息数 */
const MAX_HISTORY_MESSAGES = 50;

export class SessionManager {
    private sessions = new Map<string, ModelMessage[]>();

    /** 获取用户的对话历史 */
    getHistory(userId: string): ModelMessage[] {
        return this.sessions.get(userId) ?? [];
    }

    /** 追加用户消息 */
    appendUserMessage(userId: string, text: string): void {
        const history = this.getHistory(userId);
        history.push({ role: 'user', content: text });
        this.trimHistory(history);
        this.sessions.set(userId, history);
    }

    /** 追加 AI 回复 */
    appendAssistantMessage(userId: string, text: string): void {
        const history = this.getHistory(userId);
        history.push({ role: 'assistant', content: text });
        this.trimHistory(history);
        this.sessions.set(userId, history);
    }

    /** 清除单个用户的会话 */
    clearSession(userId: string): void {
        this.sessions.delete(userId);
    }

    /** 清除所有会话 */
    clearAll(): void {
        this.sessions.clear();
    }

    /** 当前活跃会话数 */
    get size(): number {
        return this.sessions.size;
    }

    private trimHistory(history: ModelMessage[]): void {
        if (history.length > MAX_HISTORY_MESSAGES) {
            history.splice(0, history.length - MAX_HISTORY_MESSAGES);
        }
    }
}
