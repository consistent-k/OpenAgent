import { t } from '@oagent/i18n';
import type { DynamicToolUIPart, ToolUIPart } from 'ai';
import { getToolName } from 'ai';
import { Box } from 'ink';
import React from 'react';
import { getToolStateMeta } from '../../hooks/useToolStateMeta';
import { summarizeArgs } from '../../utils/summarize-args';
import { isTerminalToolState } from '../../utils/tool-state';
import { ThemedText } from '../text/ThemedText';

type AnyToolPart = DynamicToolUIPart | ToolUIPart;

interface ToolCallPartProps {
    part: AnyToolPart;
}

const MAX_PREVIEW_LINES = 3;

function getResultLines(part: AnyToolPart): string[] {
    let raw = '';
    switch (part.state) {
        case 'output-available':
            raw = typeof part.output === 'string' ? part.output : t('tool.result.checkmark');
            break;
        case 'output-error':
            raw = part.errorText;
            break;
        case 'output-denied':
            raw = part.approval?.reason || t('tool.result.denied');
            break;
        default:
            return [];
    }
    return raw.split('\n');
}

export const ToolCallPart = React.memo(function ToolCallPart({ part }: ToolCallPartProps) {
    const meta = getToolStateMeta(part.state, 'tool');
    const head = `${getToolName(part)}(${summarizeArgs(part.input)})`;
    const isTerminal = isTerminalToolState(part.state);
    const lines = isTerminal ? getResultLines(part) : [];
    const hasMore = lines.length > MAX_PREVIEW_LINES;
    const previewLines = hasMore ? lines.slice(0, MAX_PREVIEW_LINES) : lines;
    const label = meta.label ? <ThemedText color={meta.color}>{meta.label} </ThemedText> : null;

    return (
        <Box flexDirection="column" marginBottom={1} paddingLeft={1}>
            <Box flexDirection="row">
                <ThemedText>
                    <ThemedText color={meta.color}>{meta.icon}</ThemedText> {label}
                    <ThemedText color="textDim">{head}</ThemedText>
                    {isTerminal && previewLines.length > 0 && (
                        <ThemedText>
                            <ThemedText color="subtle"> — </ThemedText>
                            <ThemedText color={meta.color}>{previewLines[0]}</ThemedText>
                        </ThemedText>
                    )}
                </ThemedText>
            </Box>
            {previewLines.length > 1 && (
                <Box paddingLeft={3} flexDirection="column">
                    {previewLines.slice(1).map((line, i) => (
                        <ThemedText key={i} color="textDim">
                            {line}
                        </ThemedText>
                    ))}
                    {hasMore && <ThemedText color="textDim">{t('tool.result.moreLines', { count: lines.length - MAX_PREVIEW_LINES })}</ThemedText>}
                </Box>
            )}
        </Box>
    );
});
