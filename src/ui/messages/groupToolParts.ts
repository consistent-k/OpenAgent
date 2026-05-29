import type { DynamicToolUIPart } from 'ai';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPart = Record<string, any>;

/**
 * Collapsible tool categories — these are read-only/search tools that can be
 * grouped together in a collapsed summary (like Claude Code's approach).
 * Write/executable tools (edit_file, write_file, execute_bash, ask_user_question)
 * break the group and are always rendered individually.
 */
const COLLAPSIBLE_TOOLS = new Set(['read_file', 'read_directory', 'grep', 'glob', 'fetch', 'web_search']);

function isCollapsible(part: AnyPart): boolean {
    return part.type === 'dynamic-tool' && COLLAPSIBLE_TOOLS.has((part as DynamicToolUIPart).toolName);
}

export interface ToolGroup {
    type: 'tool-group';
    parts: DynamicToolUIPart[];
    startIndex: number;
}

export interface SinglePart {
    type: 'single';
    part: AnyPart;
    startIndex: number;
}

export type PartGroup = ToolGroup | SinglePart;

export function groupParts(parts: AnyPart[]): PartGroup[] {
    const groups: PartGroup[] = [];
    let i = 0;

    while (i < parts.length) {
        const part = parts[i];

        if (isCollapsible(part)) {
            // Collect consecutive collapsible tools (skip reasoning between them)
            const grouped: DynamicToolUIPart[] = [part as DynamicToolUIPart];
            let j = i + 1;

            while (j < parts.length) {
                const next = parts[j];
                if (isCollapsible(next)) {
                    grouped.push(next as DynamicToolUIPart);
                    j++;
                } else if (next.type === 'reasoning') {
                    // Reasoning between collapsible tools is transparent
                    j++;
                } else {
                    break;
                }
            }

            groups.push({ type: 'tool-group', parts: grouped, startIndex: i });
            i = j;
        } else if (part.type === 'dynamic-tool') {
            // Non-collapsible tool (edit, write, bash, etc.) — always individual
            groups.push({ type: 'single', part, startIndex: i });
            i++;
        } else if (part.type === 'reasoning' && i + 1 < parts.length && isCollapsible(parts[i + 1])) {
            // Reasoning immediately before a collapsible tool — skip, consumed by group
            i++;
        } else {
            groups.push({ type: 'single', part, startIndex: i });
            i++;
        }
    }

    return groups;
}
