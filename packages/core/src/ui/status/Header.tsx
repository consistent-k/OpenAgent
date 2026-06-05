import { t } from '@oagent/i18n';
import { Box, Text } from 'ink';
import React from 'react';
import { APP_NAME } from '../../config';
import type { ChatStatus } from '../../hooks/useChatStream';
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
    pendingApproval: boolean;
}

export function Header({ status, pendingApproval }: HeaderProps) {
    const { themeName } = useTheme();
    const runState = pendingApproval
        ? { text: t('status.header.awaitingApproval'), icon: 'warning' as const }
        : status === 'streaming'
          ? { text: t('status.header.streaming'), icon: 'loading' as const }
          : { text: t('status.header.idle'), icon: 'info' as const };

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
                    <StatusIcon status={runState.icon} />
                    <ThemedText color="textDim">{runState.text}</ThemedText>
                </Box>
            </Box>
            <Divider />
        </Box>
    );
}
