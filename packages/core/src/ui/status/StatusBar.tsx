import os from 'node:os';
import { t } from '@oagent/i18n';
import { Box, Text } from 'ink';
import React, { useEffect, useState } from 'react';
import type { UsageInfo } from '../../hooks/useChatStream';
import { getBranch } from '../../utils/sessions';
import { useTheme } from '../text/theme';

// 按前缀匹配上下文窗口，新模型自动适配
const CONTEXT_WINDOWS: [string, number][] = [
    ['gemini-', 1000000],
    ['claude-', 200000],
    ['deepseek-', 128000],
    ['gpt-4', 128000],
    ['gpt-3', 16385],
    ['o1', 200000],
    ['o3', 200000],
    ['o4', 200000]
];

const DEFAULT_CONTEXT_WINDOW = 200000;

function fmt(n: number): string {
    return n.toLocaleString('en-US');
}

interface StatusBarProps {
    cwd: string;
    modelId: string;
    usage: UsageInfo | null;
}

export function StatusBar({ cwd, modelId, usage }: StatusBarProps) {
    const { theme } = useTheme();
    const [branch, setBranch] = useState('default');
    useEffect(() => {
        getBranch()
            .then(setBranch)
            .catch(() => {});
    }, []);

    const displayPath = cwd.replace(os.homedir(), '~');
    const maxTokens = CONTEXT_WINDOWS.find(([prefix]) => modelId.startsWith(prefix))?.[1] ?? DEFAULT_CONTEXT_WINDOW;

    const total = usage?.totalTokens ?? 0;
    const pct = maxTokens > 0 ? (total / maxTokens) * 100 : 0;
    const pctFormatted = pct < 0.1 ? '<0.1' : pct.toFixed(1);

    const usageColor = pct > 80 ? theme.error : pct > 50 ? theme.warning : theme.accent;

    return (
        <Box paddingX={1} paddingY={0}>
            <Text color={theme.accent}>{displayPath}</Text>
            {branch !== 'default' ? (
                <Text bold color={theme.success}>
                    {' '}
                    {branch}
                </Text>
            ) : null}
            <Text color={theme.subtle}>{' | '}</Text>
            <Text color={theme.suggestion}>{modelId}</Text>
            <Text color={theme.subtle}>{' | '}</Text>
            {usage ? (
                <>
                    <Text color={theme.textDim}>{t('status.bar.inputLabel')}</Text>
                    <Text color={theme.accent}> {fmt(usage.inputTokens)} </Text>
                    <Text color={theme.textDim}>{t('status.bar.outputLabel')}</Text>
                    <Text color={theme.success}> {fmt(usage.outputTokens)} </Text>
                    <Text color={theme.subtle}>| </Text>
                    <Text color={usageColor}>{fmt(total)}</Text>
                    <Text color={theme.textDim}> ({pctFormatted}%)</Text>
                </>
            ) : (
                <Text color={theme.textDim}>{t('status.bar.noUsage')}</Text>
            )}
        </Box>
    );
}
