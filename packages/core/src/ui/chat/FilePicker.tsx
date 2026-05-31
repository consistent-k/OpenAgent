import React from 'react';
import type { FileEntry } from '../../utils/files';
import { ListItem } from '../text/ListItem';
import { ThemedBox } from '../text/ThemedBox';

interface FilePickerProps {
    entries: FileEntry[];
    selectedIndex: number;
    query: string;
}

export function FilePicker({ entries, selectedIndex, query }: FilePickerProps) {
    if (entries.length === 0) {
        return (
            <ThemedBox borderColor="border" paddingX={1}>
                <ListItem isFocused={false} disabled>
                    {query ? `无匹配文件: ${query}` : '(空)'}
                </ListItem>
            </ThemedBox>
        );
    }

    return (
        <ThemedBox borderColor="border" flexDirection="column" paddingX={1}>
            {entries.map((entry, i) => {
                const tag = entry.type === 'dir' ? '[D]' : '[F]';
                const display = `${tag} ${entry.path}${entry.type === 'dir' ? '/' : ''}`;
                return (
                    <ListItem key={entry.path} isFocused={i === selectedIndex}>
                        {display}
                    </ListItem>
                );
            })}
        </ThemedBox>
    );
}
