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
}

export interface SlashCommand {
    name: string;
    /** 获取命令描述（每次调用时动态翻译） */
    getDescription(): string;
    run: (ctx: CommandContext) => void | Promise<void>;
}
