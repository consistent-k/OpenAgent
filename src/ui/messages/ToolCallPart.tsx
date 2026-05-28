import type { DynamicToolUIPart } from 'ai';
import { Box } from 'ink';
import React from 'react';
import { summarizeArgs } from '../../utils/summarize-args';
import { type StringThemeKeys } from '../text/theme';
import { ThemedText } from '../text/ThemedText';

interface ToolCallPartProps {
    part: DynamicToolUIPart;
}

const TOOL_STATES: Record<string, { icon: string; color: StringThemeKeys; label: string }> = {
    'input-streaming': { icon: '···', color: 'accent', label: 'waiting input' },
    'input-available': { icon: '○', color: 'accent', label: 'pending' },
    'approval-requested': { icon: '◔', color: 'warning', label: 'awaiting approval' },
    'approval-responded': { icon: '◉', color: 'success', label: 'executing' },
    'output-available': { icon: '●', color: 'success', label: '' },
    'output-error': { icon: '▲', color: 'error', label: 'error' },
    'output-denied': { icon: '▲', color: 'error', label: 'denied' }
};

const MAX_PREVIEW_LINES = 3;

function getResultLines(part: DynamicToolUIPart): string[] {
    let raw = '';
    switch (part.state) {
        case 'output-available':
            raw = typeof part.output === 'string' ? part.output : '✓';
            break;
        case 'output-error':
            raw = part.errorText;
            break;
        case 'output-denied':
            raw = part.approval?.reason || 'denied';
            break;
        default:
            return [];
    }
    return raw.split('\n');
}

export const ToolCallPart = React.memo(function ToolCallPart({ part }: ToolCallPartProps) {
    const meta = TOOL_STATES[part.state] ?? { icon: '○', color: 'inactive', label: '' };
    const head = `${part.toolName}(${summarizeArgs(part.input)})`;
    const isTerminal = part.state === 'output-available' || part.state === 'output-error' || part.state === 'output-denied';
    const lines = isTerminal ? getResultLines(part) : [];
    const hasMore = lines.length > MAX_PREVIEW_LINES;
    const previewLines = hasMore ? lines.slice(0, MAX_PREVIEW_LINES) : lines;
    const label = meta.label ? <ThemedText color={meta.color}>{meta.label} </ThemedText> : null;

    return (
        <Box flexDirection="column" marginBottom={1} paddingLeft={1}>
            <Box flexDirection="row">
                <ThemedText>
                    <ThemedText color={meta.color}>{meta.icon}</ThemedText> {label}
                    <ThemedText dimColor>{head}</ThemedText>
                    {isTerminal && previewLines.length > 0 && (
                        <ThemedText>
                            <ThemedText dimColor> — </ThemedText>
                            <ThemedText color={meta.color}>{previewLines[0]}</ThemedText>
                        </ThemedText>
                    )}
                </ThemedText>
            </Box>
            {previewLines.length > 1 && (
                <Box paddingLeft={3} flexDirection="column">
                    {previewLines.slice(1).map((line, i) => (
                        <ThemedText key={i} dimColor>
                            {line}
                        </ThemedText>
                    ))}
                    {hasMore && <ThemedText dimColor>... ({lines.length - MAX_PREVIEW_LINES} more lines)</ThemedText>}
                </Box>
            )}
        </Box>
    );
});
