import { Box, useInput } from 'ink';
import TextInput from 'ink-text-input';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { COMMANDS, findCommand, type SlashCommand } from '../../commands';
import type { PendingToolApproval } from '../../hooks/useChatStream';
import { getActiveMention, filterFiles, type FileEntry } from '../../utils/files';
import type { SessionSummary } from '../../utils/sessions';
import { Divider } from '../text/Divider';
import type { ThemeName } from '../text/theme';
import { ThemedBox } from '../text/ThemedBox';
import { ThemedText } from '../text/ThemedText';
import { CommandInput } from './CommandInput';
import { type ConfigItem } from './ConfigPicker';
import { FileMentionInput } from './FileMentionInput';
import { OverlaySlot } from './OverlaySlot';
import { useInputMode } from './useInputMode';

interface InputProps {
    // Text input (4)
    value: string;
    onChange: (v: string) => void;
    onSubmit: (v: string, highlightedCommand?: string) => void;
    disabled: boolean;
    // File index (1)
    fileIndex: FileEntry[];
    // Approval (5)
    pendingApproval: PendingToolApproval | null;
    onApprove: () => void;
    onAlwaysApprove: () => void;
    onDeny: (reason?: string) => void;
    onSelectOption: (optionText: string) => void;
    // Picker triggers + callbacks (6)
    sessionPicker: SessionSummary[] | null;
    onSelectSession: (name: string) => void;
    onDeleteSession: (name: string) => void;
    themePicker: ThemeName | null;
    onSelectTheme: (name: ThemeName) => void;
    configPicker: ConfigItem[] | null;
    onSaveConfig: (key: string, value: string) => void;
    onCancelPicker: () => void;
}

export function Input({
    value,
    onChange,
    onSubmit,
    disabled,
    fileIndex,
    pendingApproval,
    onApprove,
    onAlwaysApprove,
    onDeny,
    onSelectOption,
    sessionPicker,
    onSelectSession,
    onDeleteSession,
    themePicker,
    onSelectTheme,
    configPicker,
    onSaveConfig,
    onCancelPicker
}: InputProps) {
    // Command filtering
    const [commandIndex, setCommandIndex] = useState(0);
    const filteredCommands = useMemo<SlashCommand[]>(() => {
        if (value === '/') return COMMANDS;
        if (value.startsWith('/') && !/\s/.test(value)) return COMMANDS.filter((c) => c.name.startsWith(value));
        return [];
    }, [value]);

    // File mention filtering
    const [fileSelectedIndex, setFileSelectedIndex] = useState(0);
    const activeMention = useMemo(() => getActiveMention(value), [value]);
    const fileMatches = useMemo<FileEntry[]>(() => {
        if (!activeMention) return [];
        return filterFiles(fileIndex, activeMention.query);
    }, [activeMention, fileIndex]);

    // Mode state machine
    const { mode, overlayType, resetKey, swallowRef } = useInputMode({
        value,
        disabled,
        pendingApproval,
        sessionPicker,
        themePicker,
        configPicker,
        filteredCommands,
        fileMatches,
        commandIndex,
        fileIndex: fileSelectedIndex,
        onCommandSelect: useCallback(
            (name: string) => {
                onChange(name + ' ');
                setCommandIndex(0);
            },
            [onChange]
        ),
        onFileSelect: useCallback(
            (insert: string) => {
                const mention = getActiveMention(value);
                if (mention) {
                    const before = value.slice(0, mention.start);
                    onChange(before + insert);
                }
                setFileSelectedIndex(0);
            },
            [onChange, value]
        ),
        onCancelPicker
    });

    // Reset selection indices when query changes
    useEffect(() => {
        setCommandIndex(0);
    }, [value]);

    useEffect(() => {
        setFileSelectedIndex(0);
    }, [activeMention?.query]);

    // Detect command prefix for inline highlighting (must be before early returns to preserve hook order)
    const commandPrefix = useMemo(() => {
        if (!value.startsWith('/')) return null;
        const spaceIdx = value.indexOf(' ');
        if (spaceIdx < 0) return null;
        const cmdName = value.slice(0, spaceIdx);
        if (!findCommand(cmdName)) return null;
        return cmdName;
    }, [value]);

    // Allow backspace when command-highlighted with empty args to clear and re-enter command mode
    const isCommandEmptyArgs = commandPrefix !== null && value.length === commandPrefix.length + 1;
    useInput(
        (_input, key) => {
            if ((key.backspace || key.delete) && isCommandEmptyArgs) {
                onChange('');
            }
        },
        { isActive: !disabled && mode === 'text' && isCommandEmptyArgs }
    );

    // Overlay mode: render overlay exclusively
    if (overlayType) {
        return (
            <OverlaySlot
                overlayType={overlayType}
                pendingApproval={pendingApproval}
                onApprove={onApprove}
                onAlwaysApprove={onAlwaysApprove}
                onDeny={onDeny}
                onSelectOption={onSelectOption}
                sessionPicker={sessionPicker}
                onSelectSession={onSelectSession}
                onDeleteSession={onDeleteSession}
                themePicker={themePicker}
                onSelectTheme={onSelectTheme}
                configPicker={configPicker}
                onSaveConfig={onSaveConfig}
                onCancelPicker={onCancelPicker}
            />
        );
    }

    // Disabled mode
    if (mode === 'disabled') {
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

    // Command mode
    if (mode === 'command') {
        return <CommandInput value={value} onChange={onChange} onSubmit={onSubmit} swallowRef={swallowRef} selectedIndex={commandIndex} onSelectedIndexChange={setCommandIndex} />;
    }

    // File mention mode
    if (mode === 'file') {
        return (
            <FileMentionInput
                value={value}
                onChange={onChange}
                onSubmit={(v) => onSubmit(v)}
                fileIndex={fileIndex}
                swallowRef={swallowRef}
                selectedIndex={fileSelectedIndex}
                onSelectedIndexChange={setFileSelectedIndex}
            />
        );
    }

    // Normal text mode (with optional command-prefix highlighting)
    const makeSwallowHandler = (base: string, apply: (v: string) => void) => (v: string) => {
        const c = swallowRef.current;
        if (c && v === base + c) {
            swallowRef.current = null;
            return;
        }
        swallowRef.current = null;
        apply(v);
    };

    const argsValue = commandPrefix ? value.slice(commandPrefix.length + 1) : value;
    const handleChange = commandPrefix ? makeSwallowHandler(argsValue, (v) => onChange(commandPrefix + ' ' + v)) : makeSwallowHandler(value, (v) => onChange(v));
    const handleSubmit = commandPrefix ? (v: string) => onSubmit(commandPrefix + ' ' + v) : (v: string) => onSubmit(v);

    return (
        <Box flexDirection="column">
            <ThemedBox borderColor="border" paddingX={1}>
                <ThemedText color="accent">{'> '}</ThemedText>
                {commandPrefix && (
                    <>
                        <ThemedText color="suggestion" bold>
                            {commandPrefix}
                        </ThemedText>
                        <ThemedText> </ThemedText>
                    </>
                )}
                <TextInput key={resetKey} value={argsValue} onChange={handleChange} onSubmit={handleSubmit} />
            </ThemedBox>
            <Divider color="border" />
        </Box>
    );
}
