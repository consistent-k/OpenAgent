import { t } from '@oagent/i18n';
import { Box, Text } from 'ink';
import React from 'react';
import { APP_NAME, getModelName } from '../../config';
import type { ChatStatus } from '../../hooks/useChatStream';
import type { FileIndexStatus } from '../../hooks/useFileIndex';
import { Divider } from '../text/Divider';
import { useTheme } from '../text/theme';
import { ThemedText } from '../text/ThemedText';
import { StatusIcon } from './StatusIcon';

/** 五月天五球配色 */
const MAYDAY_BALLS = [
    { name: '冠佑', color: '#26a7e1' },
    { name: '怪兽', color: '#E95412' },
    { name: '阿信', color: '#e274a9' },
    { name: '玛莎', color: '#FFE009' },
    { name: '石头', color: '#13AF68' }
] as const;

/** 五月天五球装饰 */
function MaydayBalls() {
    return (
        <Box flexDirection="row" gap={1}>
            {MAYDAY_BALLS.map((ball) => (
                <Text key={ball.name} color={ball.color} bold>
                    ●
                </Text>
            ))}
        </Box>
    );
}

interface HeaderProps {
    status: ChatStatus;
    fileIndexStatus: FileIndexStatus;
    fileIndexCount: number;
    pendingApproval: boolean;
}

function fileIndexText(status: FileIndexStatus, count: number): { text: string; icon: 'loading' | 'error' | 'info' } {
    if (status === 'indexing') return { text: t('status.header.indexing'), icon: 'loading' };
    if (status === 'error') return { text: t('status.header.indexError'), icon: 'error' };
    return { text: t('status.header.fileCount', { count }), icon: 'info' };
}

function safeModelName(): string {
    return getModelName() || t('status.header.notConfigured');
}

export function Header({ status, fileIndexStatus, fileIndexCount, pendingApproval }: HeaderProps) {
    const { themeName } = useTheme();
    const runState = pendingApproval
        ? { text: t('status.header.awaitingApproval'), icon: 'warning' as const }
        : status === 'streaming'
          ? { text: t('status.header.streaming'), icon: 'loading' as const }
          : { text: t('status.header.idle'), icon: 'info' as const };

    const indexInfo = fileIndexText(fileIndexStatus, fileIndexCount);

    return (
        <Box flexDirection="column">
            <Box justifyContent="space-between" paddingX={1} paddingY={1}>
                <Box flexDirection="row" alignItems="center" gap={1}>
                    <ThemedText bold color="accent">
                        ▍ {APP_NAME}
                    </ThemedText>
                    {themeName === 'mayday' && <MaydayBalls />}
                </Box>
                <Box>
                    <ThemedText color="textDim">{t('status.header.modelLabel')}</ThemedText>
                    <ThemedText color="accent">{safeModelName()}</ThemedText>
                    <ThemedText color="subtle"> | </ThemedText>
                    <StatusIcon status={indexInfo.icon} />
                    <ThemedText color="textDim">{indexInfo.text}</ThemedText>
                    <ThemedText color="subtle"> | </ThemedText>
                    <StatusIcon status={runState.icon} />
                    <ThemedText color="textDim">{runState.text}</ThemedText>
                </Box>
            </Box>
            <Divider />
        </Box>
    );
}
