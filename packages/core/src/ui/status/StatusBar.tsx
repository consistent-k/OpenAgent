import os from 'node:os';
import { Box, Text } from 'ink';
import React, { useEffect, useState } from 'react';
import type { UsageInfo } from '../../hooks/useChatStream';
import { getBranch } from '../../utils/sessions';
import { useTheme } from '../text/theme';

const CONTEXT_WINDOWS: Record<string, number> = {
    'claude-sonnet-4-20250514': 200000,
    'claude-sonnet-4': 200000,
    'claude-3-5-sonnet-latest': 200000,
    'claude-3-opus-latest': 200000,
    'claude-3-haiku-latest': 200000,
    'gpt-4o': 128000,
    'gpt-4o-mini': 128000,
    'gpt-4-turbo': 128000,
    'gpt-3.5-turbo': 16385,
    'deepseek-chat': 128000,
    'deepseek-reasoner': 128000
};

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
    const maxTokens = Object.entries(CONTEXT_WINDOWS).find(([key]) => modelId.startsWith(key))?.[1] ?? DEFAULT_CONTEXT_WINDOW;

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
                    <Text color={theme.textDim}>in:</Text>
                    <Text color={theme.accent}> {fmt(usage.inputTokens)} </Text>
                    <Text color={theme.textDim}>out:</Text>
                    <Text color={theme.success}> {fmt(usage.outputTokens)} </Text>
                    <Text color={theme.subtle}>| </Text>
                    <Text color={usageColor}>{fmt(total)}</Text>
                    <Text color={theme.textDim}> ({pctFormatted}%)</Text>
                </>
            ) : (
                <Text color={theme.textDim}>no usage</Text>
            )}
        </Box>
    );
}
