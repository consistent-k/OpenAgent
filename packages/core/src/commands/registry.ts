import type { AgentEventEmitter } from '@oagent/agents';
import type { UIMessage } from 'ai';
import type { ThemeName } from '../ui/text/theme';
import type { SessionSummary } from '../utils/sessions';

export interface CommandContext {
    rawInput: string;
    args: string[];
    cwd: string;
    fileIndexCount: number;
    displayMessages: UIMessage[];
    pendingApproval: boolean;
    appendMessages: (items: UIMessage[]) => void;
    setSession: (displayMessages: UIMessage[]) => void;
    resetSession: () => void;
    saveCurrentSession: () => Promise<void>;
    newSessionId: () => void;
    reloadFileIndex: () => Promise<number>;
    exit: () => void;
    listCommands: () => SlashCommand[];
    showSessionPicker: (sessions: SessionSummary[]) => void;
    themeName: ThemeName;
    setThemeName: (name: ThemeName) => void;
    showThemePicker: () => void;
    showConfigPicker: () => void;
    showProviderPicker: () => void;
    /** 直接执行子代理，返回结果文本 */
    executeAgent: (agentId: string, task: string, emitter?: AgentEventEmitter | null) => Promise<string>;
    /** 创建流式消息（在消息列表中显示为 streaming 状态） */
    startStreaming?: (messageId: string) => void;
    /** 实时推送子代理文本输出（流式 delta，追加到流式消息） */
    streamText?: (text: string) => void;
    /** 结束流式消息（替换文本为最终结果，状态改为 done） */
    endStreaming?: (messageId: string, finalText: string) => void;
    /** 设置子代理运行状态（用于 Header 显示） */
    setSubAgentRunning?: (name: string | null) => void;
}

export interface SlashCommand {
    name: string;
    /** 获取命令描述（每次调用时动态翻译） */
    getDescription(): string;
    run: (ctx: CommandContext) => void | Promise<void>;
}
