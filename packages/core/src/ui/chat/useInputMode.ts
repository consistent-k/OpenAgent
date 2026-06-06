import { useInput } from 'ink';
import { useEffect, useRef, useState } from 'react';
import type { SlashCommand } from '../../commands/registry';
import type { PendingToolApproval } from '../../hooks/useChatStream';
import { getActiveMention, type FileEntry } from '../../utils/files';
import type { SessionSummary } from '../../utils/sessions';
import type { ThemeName } from '../text/theme';
import type { ConfigItem } from './ConfigPicker';

export type InputMode = 'approval' | 'session' | 'theme' | 'config' | 'provider' | 'disabled' | 'command' | 'file' | 'text';

export type OverlayState =
    | { type: 'approval'; data: PendingToolApproval }
    | { type: 'session'; data: SessionSummary[] }
    | { type: 'theme'; data: ThemeName }
    | { type: 'config'; data: ConfigItem[] }
    | { type: 'provider' }
    | null;

export function getMode(overlay: OverlayState, disabled: boolean, value: string): InputMode {
    if (overlay?.type === 'approval') return 'approval';
    if (overlay?.type === 'session') return 'session';
    if (overlay?.type === 'theme') return 'theme';
    if (overlay?.type === 'provider') return 'provider';
    if (overlay?.type === 'config') return 'config';
    if (disabled) return 'disabled';
    if (value.startsWith('/') && !/\s/.test(value)) return 'command';
    if (getActiveMention(value)) return 'file';
    return 'text';
}

interface UseInputModeOptions {
    mode: InputMode;
    value: string;
    disabled: boolean;
    filteredCommands: SlashCommand[];
    fileMatches: FileEntry[];
    commandIndex: number;
    fileIndex: number;
    onCommandSelect: (name: string) => void;
    onFileSelect: (path: string) => void;
}

interface UseInputModeResult {
    resetKey: number;
    swallowRef: React.MutableRefObject<string | null>;
}

export function useInputMode({ mode, value, disabled, filteredCommands, fileMatches, commandIndex, fileIndex, onCommandSelect, onFileSelect }: UseInputModeOptions): UseInputModeResult {
    const swallowRef = useRef<string | null>(null);
    const [resetKey, setResetKey] = useState(0);
    const prevModeRef = useRef<InputMode>('text');

    const isOverlay = mode === 'approval' || mode === 'session' || mode === 'theme' || mode === 'config' || mode === 'provider';

    // Reset TextInput when returning to text mode from a non-text mode
    useEffect(() => {
        const prev = prevModeRef.current;
        if (prev !== 'text' && mode === 'text') {
            setResetKey((k) => k + 1);
        }
        prevModeRef.current = mode;
    }, [mode]);

    // Global key handling: ctrl+r/ctrl+o swallowing, Tab for command completion, Tab/Enter for file selection
    useInput(
        (input, key) => {
            // Swallow ctrl+r / ctrl+o (handled by App.tsx)
            if (key.ctrl && (input === 'r' || input === 'o')) {
                swallowRef.current = input;
                return;
            }

            // Tab: command mode → select highlighted command
            if (key.tab && mode === 'command') {
                const target = filteredCommands[commandIndex];
                if (target && target.name !== value) {
                    onCommandSelect(target.name);
                    setResetKey((k) => k + 1);
                }
                return;
            }

            // Tab/Enter: file mention mode → select highlighted file
            if ((key.tab || key.return) && mode === 'file') {
                const activeMention = getActiveMention(value);
                const target = fileMatches[fileIndex];
                if (target && activeMention) {
                    const insert = `@${target.path}${target.type === 'dir' ? '/' : ''} `;
                    onFileSelect(insert);
                    setResetKey((k) => k + 1);
                }
                return;
            }
        },
        { isActive: !disabled || isOverlay }
    );

    return { resetKey, swallowRef };
}
