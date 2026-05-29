import { Box, useInput } from 'ink';
import TextInput from 'ink-text-input';
import React, { useEffect, useRef, useState } from 'react';
import type { PendingToolApproval } from '../../hooks/useChatStream';
import { getActiveMention, type FileEntry } from '../../utils/files';
import type { SessionSummary } from '../../utils/sessions';
import { Divider } from '../text/Divider';
import type { ThemeName } from '../text/theme';
import { ThemedBox } from '../text/ThemedBox';
import { ThemedText } from '../text/ThemedText';
import { ApprovalDialog } from './ApprovalDialog';
import { CommandInput } from './CommandInput';
import { FileMentionInput } from './FileMentionInput';
import { SessionPicker } from './SessionPicker';
import { ThemePicker } from './ThemePicker';

interface InputProps {
    value: string;
    onChange: (v: string) => void;
    onSubmit: (v: string, highlightedCommand?: string) => void;
    disabled: boolean;
    fileIndex: FileEntry[];
    pendingApproval: PendingToolApproval | null;
    onApprove: () => void;
    onDeny: (reason?: string) => void;
    onSelectOption: (optionText: string) => void;
    sessionPicker: SessionSummary[] | null;
    onSelectSession: (name: string) => void;
    onCancelSession: () => void;
    currentThemeName: ThemeName;
    themePickerOpen: boolean;
    onSelectTheme: (name: ThemeName) => void;
    onCancelTheme: () => void;
}

type InputMode = 'approval' | 'session' | 'theme' | 'disabled' | 'command' | 'file' | 'text';

function getMode(value: string, disabled: boolean, pendingApproval: PendingToolApproval | null, sessionPicker: SessionSummary[] | null, themePickerOpen: boolean): InputMode {
    if (pendingApproval) return 'approval';
    if (sessionPicker) return 'session';
    if (themePickerOpen) return 'theme';
    if (disabled) return 'disabled';
    if (value.startsWith('/') && !/\s/.test(value)) return 'command';
    if (getActiveMention(value)) return 'file';
    return 'text';
}

export function Input({
    value,
    onChange,
    onSubmit,
    disabled,
    fileIndex,
    pendingApproval,
    onApprove,
    onDeny,
    onSelectOption,
    sessionPicker,
    onSelectSession,
    onCancelSession,
    currentThemeName,
    themePickerOpen,
    onSelectTheme,
    onCancelTheme
}: InputProps) {
    const swallowChar = useRef<string | null>(null);
    const [inputResetKey, setInputResetKey] = useState(0);
    const prevModeRef = useRef<InputMode>('text');

    const mode = getMode(value, disabled, pendingApproval, sessionPicker, themePickerOpen);

    useEffect(() => {
        const prev = prevModeRef.current;
        if (prev !== 'text' && mode === 'text') {
            setInputResetKey((k) => k + 1);
        }
        prevModeRef.current = mode;
    }, [mode]);

    useInput(
        (_input, key) => {
            if (key.ctrl && (_input === 'r' || _input === 'o')) {
                swallowChar.current = _input;
            }
        },
        { isActive: !disabled && !pendingApproval }
    );

    // Mode 1: Approval dialog
    if (pendingApproval) {
        return <ApprovalDialog pending={pendingApproval} onApprove={onApprove} onDeny={onDeny} onSelectOption={onSelectOption} />;
    }

    // Mode 1b: Session picker
    if (sessionPicker) {
        return <SessionPicker sessions={sessionPicker} onSelect={onSelectSession} onCancel={onCancelSession} />;
    }

    // Mode 1c: Theme picker
    if (themePickerOpen) {
        return <ThemePicker current={currentThemeName} onSelect={onSelectTheme} onCancel={onCancelTheme} />;
    }

    // Mode 2: Disabled (AI is responding)
    if (disabled) {
        return (
            <Box flexDirection="column">
                <ThemedBox borderColor="border" paddingX={1}>
                    <ThemedText color="textDim">{'> '}</ThemedText>
                    <ThemedText color="textDim">{value || '(AI 正在回复，按 Esc 或 Ctrl+C 停止…)'}</ThemedText>
                </ThemedBox>
                <Divider color="border" />
            </Box>
        );
    }

    // Mode 3: Slash command palette
    const showPalette = value.startsWith('/') && !/\s/.test(value);
    if (showPalette) {
        return <CommandInput value={value} onChange={onChange} onSubmit={onSubmit} swallowRef={swallowChar} />;
    }

    // Mode 4: File mention
    const activeMention = getActiveMention(value);
    if (activeMention) {
        return <FileMentionInput value={value} onChange={onChange} onSubmit={(v) => onSubmit(v)} fileIndex={fileIndex} swallowRef={swallowChar} />;
    }

    // Mode 5: Normal text input
    const handleChange = (v: string) => {
        const c = swallowChar.current;
        if (c && v === value + c) {
            swallowChar.current = null;
            return;
        }
        swallowChar.current = null;
        onChange(v);
    };

    return (
        <Box flexDirection="column">
            <ThemedBox borderColor="border" paddingX={1}>
                <ThemedText color="accent">{'> '}</ThemedText>
                <TextInput key={inputResetKey} value={value} onChange={handleChange} onSubmit={(v) => onSubmit(v)} />
            </ThemedBox>
            <Divider color="border" />
        </Box>
    );
}
