import type { DynamicToolUIPart } from 'ai';
import { Box } from 'ink';
import React from 'react';
import { type StringThemeKeys } from '../text/theme';
import { ThemedText } from '../text/ThemedText';
import { ToolCallPart } from './ToolCallPart';

interface ToolCallGroupProps {
    parts: DynamicToolUIPart[];
    expanded: boolean;
}

const TOOL_VERBS: Record<string, { active: string; done: string; singular: string; plural: string }> = {
    read_file: { active: 'Reading', done: 'Read', singular: 'file', plural: 'files' },
    read_directory: { active: 'Listing', done: 'Listed', singular: 'directory', plural: 'directories' },
    grep: { active: 'Searching', done: 'Searched', singular: 'pattern', plural: 'patterns' },
    glob: { active: 'Finding', done: 'Found', singular: 'pattern', plural: 'patterns' },
    fetch: { active: 'Fetching', done: 'Fetched', singular: 'url', plural: 'urls' },
    web_search: { active: 'Searching', done: 'Searched', singular: 'query', plural: 'queries' }
};

function pluralize(count: number, singular: string, plural: string): string {
    return count === 1 ? singular : plural;
}

function countByCategory(parts: DynamicToolUIPart[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const part of parts) {
        counts.set(part.toolName, (counts.get(part.toolName) ?? 0) + 1);
    }
    return counts;
}

function buildSummary(parts: DynamicToolUIPart[]): string {
    const counts = countByCategory(parts);
    const segments: string[] = [];
    const order = ['read_file', 'read_directory', 'grep', 'glob', 'fetch', 'web_search'];

    for (const toolName of order) {
        const count = counts.get(toolName);
        if (!count) continue;
        const verbs = TOOL_VERBS[toolName];
        if (verbs) {
            segments.push(`${verbs.done} ${count} ${pluralize(count, verbs.singular, verbs.plural)}`);
        } else {
            segments.push(`${toolName} × ${count}`);
        }
    }

    for (const [toolName, count] of counts) {
        if (!order.includes(toolName)) {
            segments.push(`${toolName} × ${count}`);
        }
    }

    return segments.join(', ');
}

function getHint(part: DynamicToolUIPart): string | undefined {
    const input = part.input as Record<string, unknown> | undefined;
    if (!input || typeof input !== 'object') return undefined;

    for (const key of ['path', 'pattern', 'query', 'command', 'url']) {
        const val = input[key];
        if (typeof val === 'string' && val.length > 0) {
            return val.length > 50 ? val.slice(0, 50) + '…' : val;
        }
    }
    return undefined;
}

function getGroupState(parts: DynamicToolUIPart[]): { icon: string; color: StringThemeKeys } {
    const hasError = parts.some((p) => p.state === 'output-error');
    const hasDenied = parts.some((p) => p.state === 'output-denied');

    if (hasError) return { icon: '▲', color: 'error' };
    if (hasDenied) return { icon: '▲', color: 'error' };
    return { icon: '●', color: 'success' };
}

export const ToolCallGroup = React.memo(function ToolCallGroup({ parts, expanded }: ToolCallGroupProps) {
    // Single tool call: render as individual tool (no group wrapper)
    if (parts.length === 1) {
        return (
            <Box flexDirection="column">
                <ToolCallPart part={parts[0]} />
            </Box>
        );
    }

    const { icon, color } = getGroupState(parts);
    const errorCount = parts.filter((p) => p.state === 'output-error').length;

    // Expanded: show summary header + individual parts
    if (expanded) {
        const hint = getHint(parts[parts.length - 1]);
        return (
            <Box flexDirection="column">
                <Box paddingLeft={1} flexDirection="column">
                    <ThemedText>
                        <ThemedText color={color}>{icon}</ThemedText>
                        <ThemedText> {buildSummary(parts)}</ThemedText>
                    </ThemedText>
                    {hint && (
                        <ThemedText color="textDim">
                            {'  '}
                            {hint}
                        </ThemedText>
                    )}
                </Box>
                <Box paddingLeft={2} flexDirection="column">
                    {parts.map((part) => (
                        <ToolCallPart key={part.toolCallId} part={part} />
                    ))}
                </Box>
            </Box>
        );
    }

    // Collapsed: single summary line with expand hint
    return (
        <Box paddingLeft={1} marginBottom={1}>
            <ThemedText>
                <ThemedText color={color}>{icon}</ThemedText>
                <ThemedText> {buildSummary(parts)}</ThemedText>
                {errorCount > 0 && (
                    <ThemedText color="error">
                        {' '}
                        ({errorCount} error{errorCount > 1 ? 's' : ''})
                    </ThemedText>
                )}
                <ThemedText color="textDim"> (Ctrl+O to expand)</ThemedText>
            </ThemedText>
        </Box>
    );
});
