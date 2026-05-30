import { Box, useInput } from 'ink';
import TextInput from 'ink-text-input';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { COMMANDS, type SlashCommand } from '../../commands';
import { Divider } from '../text/Divider';
import { ThemedBox } from '../text/ThemedBox';
import { ThemedText } from '../text/ThemedText';
import { CommandPalette } from './CommandPalette';

interface CommandInputProps {
    value: string;
    onChange: (v: string) => void;
    onSubmit: (v: string, highlightedCommand?: string) => void;
    swallowRef: React.MutableRefObject<string | null>;
    selectedIndex?: number;
    onSelectedIndexChange?: (index: number) => void;
}

export function CommandInput({ value, onChange, onSubmit, swallowRef, selectedIndex: externalSelectedIndex, onSelectedIndexChange }: CommandInputProps) {
    const [internalSelectedIndex, setInternalSelectedIndex] = useState(0);
    const selectedIndex = externalSelectedIndex ?? internalSelectedIndex;
    const setSelectedIndex = onSelectedIndexChange ?? setInternalSelectedIndex;

    const filtered = useMemo<SlashCommand[]>(() => {
        if (value === '/') return COMMANDS;
        return COMMANDS.filter((c) => c.name.startsWith(value));
    }, [value]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [value]);

    const handleChange = useCallback(
        (v: string) => {
            const c = swallowRef.current;
            if (c && v === value + c) {
                swallowRef.current = null;
                return;
            }
            swallowRef.current = null;
            onChange(v);
        },
        [onChange, value, swallowRef]
    );

    useInput((_input, key) => {
        if (filtered.length === 0) return;
        if (key.upArrow) {
            setSelectedIndex(Math.max(0, selectedIndex - 1));
        } else if (key.downArrow) {
            setSelectedIndex(Math.min(filtered.length - 1, selectedIndex + 1));
        }
    });

    const handleSubmit = useCallback(
        (v: string) => {
            const highlighted = filtered[selectedIndex] ? filtered[selectedIndex].name : undefined;
            onSubmit(v, highlighted);
        },
        [filtered, selectedIndex, onSubmit]
    );

    return (
        <Box flexDirection="column">
            <ThemedBox borderColor="border" paddingX={1}>
                <ThemedText color="accent">{'> '}</ThemedText>
                <TextInput value={value} onChange={handleChange} onSubmit={handleSubmit} />
            </ThemedBox>
            <Divider color="border" />
            <CommandPalette commands={filtered} selectedIndex={selectedIndex} />
        </Box>
    );
}
