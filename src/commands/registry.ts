import type { UIMessage } from 'ai';
import type { ModelMessage } from 'ai';
import type { ThemeName } from '../ui/text/theme';
import type { SessionSummary } from '../utils/sessions';

export interface CommandContext {
    rawInput: string;
    args: string[];
    cwd: string;
    fileIndexCount: number;
    messages: ModelMessage[];
    displayMessages: UIMessage[];
    pendingApproval: boolean;
    appendMessages: (items: UIMessage[]) => void;
    setSession: (messages: ModelMessage[], displayMessages: UIMessage[]) => void;
    resetSession: () => void;
    saveCurrentSession: () => Promise<void>;
    cancelResponse: () => void;
    reloadFileIndex: () => Promise<number>;
    exit: () => void;
    listCommands: () => SlashCommand[];
    showSessionPicker: (sessions: SessionSummary[]) => void;
    themeName: ThemeName;
    setThemeName: (name: ThemeName) => void;
    showThemePicker: () => void;
}

export interface SlashCommand {
    name: string;
    description: string;
    run: (ctx: CommandContext) => void | Promise<void>;
}
