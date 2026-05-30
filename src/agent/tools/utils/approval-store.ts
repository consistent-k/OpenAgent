import path from 'node:path';
import { getOpenAgentDir } from '@/config';
import { readJsonFile, writeJsonFile } from '@/utils/fs';

const APPROVALS_PATH = path.join(getOpenAgentDir(), 'approvals.json');

export const APPROVABLE_TOOLS = ['execute_bash', 'write_file', 'edit_file'] as const;

export type ApprovableToolName = (typeof APPROVABLE_TOOLS)[number];

interface ApprovalPreferences {
    execute_bash?: boolean;
    write_file?: boolean;
    edit_file?: boolean;
}

let cached: ApprovalPreferences | null = null;

function readPreferences(): ApprovalPreferences {
    if (cached) return cached;
    cached = readJsonFile<ApprovalPreferences>(APPROVALS_PATH) ?? {};
    return cached;
}

function writePreferences(prefs: ApprovalPreferences): void {
    writeJsonFile(APPROVALS_PATH, prefs);
    cached = prefs;
}

export function isToolApproved(toolName: string): boolean {
    const prefs = readPreferences();
    return prefs[toolName as ApprovableToolName] === true;
}

export function setToolApproval(toolName: string, approved: boolean): void {
    const prefs = readPreferences();
    prefs[toolName as ApprovableToolName] = approved;
    writePreferences(prefs);
}

export function clearAllApprovals(): void {
    writePreferences({});
}

export function getApprovalSummary(): Record<string, boolean> {
    const prefs = readPreferences();
    const summary: Record<string, boolean> = {};
    for (const tool of APPROVABLE_TOOLS) {
        summary[tool] = prefs[tool] === true;
    }
    return summary;
}
