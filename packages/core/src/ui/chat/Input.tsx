import { t } from '@oagent/i18n';
import { Box, useInput } from 'ink';
import type { ReactNode } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { COMMANDS } from '../../commands';
import { filterFiles, getActiveMention, type FileEntry } from '../../utils/files';
import { Divider } from '../text/Divider';
import { ThemedBox } from '../text/ThemedBox';
import { ThemedText } from '../text/ThemedText';
import { CommandPalette } from './CommandPalette';
import { FileMentionInput } from './FileMentionInput';
import { ThemedInput } from './ThemedInput';
import type { InputMode } from './useInputMode';
import { useInputMode } from './useInputMode';

// ---- Props: 7 down from 29 ----
interface InputProps {
    value: string;
    onChange: (v: string) => void;
    onSubmit: (v: string, highlightedCommand?: string) => void;
    disabled: boolean;
    fileIndex: FileEntry[];
    mode: InputMode;
    children?: ReactNode;
}

export function Input({ value, onChange, onSubmit, disabled, fileIndex, mode, children }: InputProps) {
    // ---- Internal state ----
    const [commandIndex, setCommandIndex] = useState(0);
    const [fileIndexState, setFileIndexState] = useState(0);

    // ---- Derived data ----
    const filteredCommands = useMemo(() => {
        if (!value.startsWith('/') || /\s/.test(value)) return [];
        if (value === '/') return COMMANDS;
        return COMMANDS.filter((cmd) => cmd.name.startsWith(value));
    }, [value]);

    const fileMatches = useMemo(() => {
        const activeMention = getActiveMention(value);
        if (!activeMention) return [];
        return filterFiles(fileIndex, activeMention.query, 10);
    }, [value, fileIndex]);

    // ---- Callbacks ----
    const handleCommandSelect = useCallback(
        (name: string) => {
            onChange(name + ' ');
            setCommandIndex(0);
        },
        [onChange]
    );

    const handleFileSelect = useCallback(
        (insert: string) => {
            const mention = getActiveMention(value);
            if (!mention) return;
            const before = value.slice(0, mention.start);
            const end = mention.start + 1 + mention.query.length;
            const after = value.slice(end);
            onChange(before + insert + after);
            setFileIndexState(0);
        },
        [value, onChange]
    );

    // ---- Mode detection hook (resetKey + swallowRef + keyboard handling) ----
    const { resetKey, swallowRef } = useInputMode({
        mode,
        value,
        disabled,
        filteredCommands,
        fileMatches,
        commandIndex,
        fileIndex: fileIndexState,
        onCommandSelect: handleCommandSelect,
        onFileSelect: handleFileSelect
    });

    // ---- Command mode: arrow key selection + Enter submit ----
    useInput(
        (_input, key) => {
            if (key.upArrow) {
                setCommandIndex((i) => Math.max(0, i - 1));
            } else if (key.downArrow) {
                setCommandIndex((i) => Math.min(filteredCommands.length - 1, i + 1));
            } else if (key.return) {
                const highlighted = filteredCommands[commandIndex]?.name;
                onSubmit(value, highlighted);
                onChange('');
            }
        },
        { isActive: mode === 'command' }
    );

    // ---- Render ----
    // Overlay mode: render overlay exclusively
    if (mode === 'approval' || mode === 'session' || mode === 'theme' || mode === 'config' || mode === 'provider') {
        return <>{children}</>;
    }

    // Disabled mode
    if (mode === 'disabled') {
        return (
            <Box flexDirection="column">
                <ThemedBox borderColor="border" paddingX={1}>
                    <ThemedText color="textDim">{'> '}</ThemedText>
                    <ThemedText color="textDim">{value || t('ui.input.aiResponding')}</ThemedText>
                </ThemedBox>
                <Divider color="border" />
            </Box>
        );
    }

    // Command mode: ThemedInput + CommandPalette
    if (mode === 'command') {
        return (
            <Box flexDirection="column">
                <ThemedInput
                    value={value}
                    onChange={(v) => {
                        onChange(v);
                        setCommandIndex(0);
                    }}
                    onSubmit={(text) => {
                        const highlighted = filteredCommands[commandIndex]?.name;
                        onSubmit(text, highlighted);
                        onChange('');
                    }}
                    swallowRef={swallowRef}
                />
                <Divider color="border" />
                {value.startsWith('/') && <CommandPalette commands={filteredCommands} selectedIndex={commandIndex} />}
            </Box>
        );
    }

    // File mention mode
    if (mode === 'file') {
        return (
            <FileMentionInput
                value={value}
                onChange={onChange}
                onSubmit={() => onSubmit(value)}
                fileIndex={fileIndex}
                swallowRef={swallowRef}
                selectedIndex={fileIndexState}
                onSelectedIndexChange={setFileIndexState}
            />
        );
    }

    // Normal text mode
    return (
        <Box flexDirection="column">
            <ThemedInput key={resetKey} value={value} onChange={onChange} onSubmit={(text) => onSubmit(text)} swallowRef={swallowRef} />
            <Divider color="border" />
        </Box>
    );
}
