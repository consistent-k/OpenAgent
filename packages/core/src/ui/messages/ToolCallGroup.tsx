import { t } from '@oagent/i18n';
import type { DynamicToolUIPart, ToolUIPart } from 'ai';
import { getToolName } from 'ai';
import { Box } from 'ink';
import React from 'react';
import { type StringThemeKeys } from '../text/theme';
import { ThemedText } from '../text/ThemedText';
import { ToolCallPart } from './ToolCallPart';

type AnyToolPart = DynamicToolUIPart | ToolUIPart;

interface ToolCallGroupProps {
    parts: AnyToolPart[];
    expanded: boolean;
}

type ToolVerbs = Record<string, { active: string; done: string; singular: string; plural: string }>;

function getToolVerbs(): ToolVerbs {
    return {
        read_file: { active: t('tool.verb.reading'), done: t('tool.verb.read'), singular: t('tool.verb.file'), plural: t('tool.verb.files') },
        read_directory: { active: t('tool.verb.listing'), done: t('tool.verb.listed'), singular: t('tool.verb.directory'), plural: t('tool.verb.directories') },
        grep: { active: t('tool.verb.searching'), done: t('tool.verb.searched'), singular: t('tool.verb.pattern'), plural: t('tool.verb.patterns') },
        glob: { active: t('tool.verb.finding'), done: t('tool.verb.found'), singular: t('tool.verb.pattern'), plural: t('tool.verb.patterns') },
        fetch: { active: t('tool.verb.fetching'), done: t('tool.verb.fetched'), singular: t('tool.verb.url'), plural: t('tool.verb.urls') },
        web_search: { active: t('tool.verb.searching'), done: t('tool.verb.searched'), singular: t('tool.verb.query'), plural: t('tool.verb.queries') }
    };
}

function pluralize(count: number, singular: string, plural: string): string {
    return count === 1 ? singular : plural;
}

function countByCategory(parts: AnyToolPart[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const part of parts) {
        const name = getToolName(part);
        counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return counts;
}

function buildSummary(parts: AnyToolPart[], toolVerbs: ToolVerbs): string {
    const counts = countByCategory(parts);
    const segments: string[] = [];
    const order = ['read_file', 'read_directory', 'grep', 'glob', 'fetch', 'web_search'];

    for (const toolName of order) {
        const count = counts.get(toolName);
        if (!count) continue;
        const verbs = toolVerbs[toolName];
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

function getHint(part: AnyToolPart): string | undefined {
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

function getGroupState(parts: AnyToolPart[]): { icon: string; color: StringThemeKeys } {
    const hasError = parts.some((p) => p.state === 'output-error');
    const hasDenied = parts.some((p) => p.state === 'output-denied');

    if (hasError) return { icon: '▲', color: 'error' };
    if (hasDenied) return { icon: '▲', color: 'error' };
    return { icon: '●', color: 'success' };
}

export const ToolCallGroup = React.memo(function ToolCallGroup({ parts, expanded }: ToolCallGroupProps) {
    const toolVerbs = getToolVerbs();

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
                        <ThemedText> {buildSummary(parts, toolVerbs)}</ThemedText>
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
                <ThemedText> {buildSummary(parts, toolVerbs)}</ThemedText>
                {errorCount > 0 && <ThemedText color="error"> {t('tool.group.errorCount', { count: errorCount, s: errorCount > 1 ? 's' : '' })}</ThemedText>}
                <ThemedText color="textDim"> {t('tool.group.expandHint')}</ThemedText>
            </ThemedText>
        </Box>
    );
});
