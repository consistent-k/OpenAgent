import { Box, useInput } from 'ink';
import TextInput from 'ink-text-input';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { filterFiles, getActiveMention, type FileEntry } from '../../utils/files';
import { Divider } from '../text/Divider';
import { ThemedBox } from '../text/ThemedBox';
import { ThemedText } from '../text/ThemedText';
import { FilePicker } from './FilePicker';

interface FileMentionInputProps {
    value: string;
    onChange: (v: string) => void;
    onSubmit: (v: string) => void;
    fileIndex: FileEntry[];
    swallowRef: React.MutableRefObject<string | null>;
    selectedIndex?: number;
    onSelectedIndexChange?: (index: number) => void;
}

export function FileMentionInput({ value, onChange, onSubmit, fileIndex, swallowRef, selectedIndex: externalSelectedIndex, onSelectedIndexChange }: FileMentionInputProps) {
    const [internalSelectedIndex, setInternalSelectedIndex] = useState(0);
    const selectedIndex = externalSelectedIndex ?? internalSelectedIndex;
    const setSelectedIndex = onSelectedIndexChange ?? setInternalSelectedIndex;

    const activeMention = useMemo(() => getActiveMention(value), [value]);
    const fileMatches = useMemo<FileEntry[]>(() => {
        if (!activeMention) return [];
        return filterFiles(fileIndex, activeMention.query);
    }, [activeMention, fileIndex]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [activeMention?.query]);

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
        if (!activeMention || fileMatches.length === 0) return;
        if (key.upArrow) {
            setSelectedIndex(Math.max(0, selectedIndex - 1));
        } else if (key.downArrow) {
            setSelectedIndex(Math.min(fileMatches.length - 1, selectedIndex + 1));
        }
    });

    const handleSubmit = useCallback(
        (v: string) => {
            if (fileMatches.length > 0) return;
            onSubmit(v);
        },
        [fileMatches.length, onSubmit]
    );

    return (
        <Box flexDirection="column">
            <ThemedBox borderColor="border" paddingX={1}>
                <ThemedText color="accent">{'> '}</ThemedText>
                <TextInput value={value} onChange={handleChange} onSubmit={handleSubmit} />
            </ThemedBox>
            <Divider color="border" />
            {activeMention && <FilePicker entries={fileMatches} selectedIndex={selectedIndex} query={activeMention.query} />}
        </Box>
    );
}
