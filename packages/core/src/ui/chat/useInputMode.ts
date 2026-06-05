import { useInput } from 'ink';
import { useEffect, useRef, useState } from 'react';
import type { SlashCommand } from '../../commands/registry';
import type { PendingToolApproval } from '../../hooks/useChatStream';
import { getActiveMention, type FileEntry } from '../../utils/files';
import type { SessionSummary } from '../../utils/sessions';
import type { ThemeName } from '../text/theme';
import type { ConfigItem } from './ConfigPicker';

export type InputMode = 'approval' | 'session' | 'theme' | 'config' | 'provider' | 'disabled' | 'command' | 'file' | 'text';
export type OverlayType = 'approval' | 'session' | 'theme' | 'config' | 'provider' | null;

interface UseInputModeOptions {
    value: string;
    disabled: boolean;
    pendingApproval: PendingToolApproval | null;
    sessionPicker: SessionSummary[] | null;
    themePicker: ThemeName | null;
    configPicker: ConfigItem[] | null;
    providerPicker: boolean;
    filteredCommands: SlashCommand[];
    fileMatches: FileEntry[];
    commandIndex: number;
    fileIndex: number;
    onCommandSelect: (name: string) => void;
    onFileSelect: (path: string) => void;
    onCancelPicker: () => void;
}

interface UseInputModeResult {
    mode: InputMode;
    overlayType: OverlayType;
    resetKey: number;
    swallowRef: React.MutableRefObject<string | null>;
}

function getMode(
    value: string,
    disabled: boolean,
    pendingApproval: PendingToolApproval | null,
    sessionPicker: SessionSummary[] | null,
    themePicker: ThemeName | null,
    configPicker: ConfigItem[] | null,
    providerPicker: boolean
): InputMode {
    if (pendingApproval) return 'approval';
    if (sessionPicker) return 'session';
    if (themePicker) return 'theme';
    if (providerPicker) return 'provider';
    if (configPicker) return 'config';
    if (disabled) return 'disabled';
    if (value.startsWith('/') && !/\s/.test(value)) return 'command';
    if (getActiveMention(value)) return 'file';
    return 'text';
}

function getOverlayType(mode: InputMode): OverlayType {
    if (mode === 'approval' || mode === 'session' || mode === 'theme' || mode === 'config' || mode === 'provider') {
        return mode;
    }
    return null;
}

export function useInputMode({
    value,
    disabled,
    pendingApproval,
    sessionPicker,
    themePicker,
    configPicker,
    providerPicker,
    filteredCommands,
    fileMatches,
    commandIndex,
    fileIndex,
    onCommandSelect,
    onFileSelect,
    onCancelPicker
}: UseInputModeOptions): UseInputModeResult {
    const swallowRef = useRef<string | null>(null);
    const [resetKey, setResetKey] = useState(0);
    const prevModeRef = useRef<InputMode>('text');

    const mode = getMode(value, disabled, pendingApproval, sessionPicker, themePicker, configPicker, providerPicker);
    const overlayType = getOverlayType(mode);

    // Reset TextInput when returning to text mode from a non-text mode
    useEffect(() => {
        const prev = prevModeRef.current;
        if (prev !== 'text' && mode === 'text') {
            setResetKey((k) => k + 1);
        }
        prevModeRef.current = mode;
    }, [mode]);

    // Global key handling: Tab for completion, Escape for overlay exit
    useInput(
        (input, key) => {
            // Swallow ctrl+r / ctrl+o (handled by App.tsx)
            if (key.ctrl && (input === 'r' || input === 'o')) {
                swallowRef.current = input;
                return;
            }

            // Escape: exit overlay/approval → notify parent to clear picker state
            // Skip for 'provider' overlay — it handles Esc navigation internally
            if (key.escape && overlayType && overlayType !== 'provider') {
                onCancelPicker();
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
        { isActive: !disabled || !!overlayType }
    );

    return { mode, overlayType, resetKey, swallowRef };
}
