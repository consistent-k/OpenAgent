import { Box } from 'ink';
import React from 'react';
import { APP_NAME, getModelName } from '../../config';
import type { ChatStatus } from '../../hooks/useChatStream';
import type { FileIndexStatus } from '../../hooks/useFileIndex';
import { Divider } from '../text/Divider';
import { ThemedText } from '../text/ThemedText';
import { StatusIcon } from './StatusIcon';

interface HeaderProps {
    status: ChatStatus;
    fileIndexStatus: FileIndexStatus;
    fileIndexCount: number;
    pendingApproval: boolean;
}

function fileIndexText(status: FileIndexStatus, count: number): { text: string; icon: 'loading' | 'error' | 'info' } {
    if (status === 'indexing') return { text: 'indexing...', icon: 'loading' };
    if (status === 'error') return { text: 'index error', icon: 'error' };
    return { text: `${count} files`, icon: 'info' };
}

function safeModelName(): string {
    try {
        return getModelName();
    } catch {
        return '未配置';
    }
}

export function Header({ status, fileIndexStatus, fileIndexCount, pendingApproval }: HeaderProps) {
    const runState = pendingApproval
        ? { text: 'awaiting approval', icon: 'warning' as const }
        : status === 'streaming'
          ? { text: 'streaming...', icon: 'loading' as const }
          : { text: 'idle', icon: 'info' as const };

    const indexInfo = fileIndexText(fileIndexStatus, fileIndexCount);

    return (
        <Box flexDirection="column">
            <Box borderStyle="round" paddingX={1} justifyContent="space-between">
                <ThemedText bold color="accent">
                    ▍ {APP_NAME}
                </ThemedText>
                <Box>
                    <ThemedText dimColor>model: </ThemedText>
                    <ThemedText color="accent" dimColor>
                        {safeModelName()}
                    </ThemedText>
                    <ThemedText dimColor> | </ThemedText>
                    <StatusIcon status={indexInfo.icon} />
                    <ThemedText dimColor>{indexInfo.text}</ThemedText>
                    <ThemedText dimColor> | </ThemedText>
                    <StatusIcon status={runState.icon} />
                    <ThemedText dimColor>{runState.text}</ThemedText>
                </Box>
            </Box>
            <Divider />
        </Box>
    );
}
