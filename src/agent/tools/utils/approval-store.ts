import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const APPROVALS_PATH = path.join(os.homedir(), '.openagent', 'approvals.json');

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

    if (!fs.existsSync(APPROVALS_PATH)) {
        cached = {};
        return cached;
    }

    try {
        cached = JSON.parse(fs.readFileSync(APPROVALS_PATH, 'utf-8')) as ApprovalPreferences;
        return cached;
    } catch {
        cached = {};
        return cached;
    }
}

function writePreferences(prefs: ApprovalPreferences): void {
    const dir = path.dirname(APPROVALS_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(APPROVALS_PATH, JSON.stringify(prefs, null, 4), 'utf-8');
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
