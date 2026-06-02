import type { DynamicToolUIPart, ToolUIPart, UIMessage } from 'ai';
import { getToolName, isToolUIPart } from 'ai';

type Part = UIMessage['parts'][number];
type AnyToolPart = DynamicToolUIPart | ToolUIPart;

/**
 * Collapsible tool categories — these are read-only/search tools that can be
 * grouped together in a collapsed summary (like Claude Code's approach).
 * Write/executable tools (edit_file, write_file, execute_bash, ask_user_question)
 * break the group and are always rendered individually.
 */
const COLLAPSIBLE_TOOLS = new Set(['read_file', 'read_directory', 'grep', 'glob', 'fetch', 'web_search']);

function isCollapsible(part: Part): boolean {
    return isToolUIPart(part) && COLLAPSIBLE_TOOLS.has(getToolName(part));
}

export interface ToolGroup {
    type: 'tool-group';
    parts: AnyToolPart[];
    startIndex: number;
}

export interface SinglePart {
    type: 'single';
    part: Part;
    startIndex: number;
}

export type PartGroup = ToolGroup | SinglePart;

export function groupParts(parts: Part[]): PartGroup[] {
    const groups: PartGroup[] = [];
    let i = 0;

    while (i < parts.length) {
        const part = parts[i];

        if (isCollapsible(part)) {
            // Collect consecutive collapsible tools (skip reasoning between them)
            const grouped: AnyToolPart[] = [part as AnyToolPart];
            let j = i + 1;

            while (j < parts.length) {
                const next = parts[j];
                if (isCollapsible(next)) {
                    grouped.push(next as AnyToolPart);
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
        } else if (isToolUIPart(part)) {
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
