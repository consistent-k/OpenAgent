import { AsyncLocalStorage } from 'node:async_hooks';
import path from 'node:path';
import { getOpenAgentDir } from '@/config';
import { readJsonFile, writeJsonFile } from '@/utils/fs';

export const APPROVALS_DIR = path.join(getOpenAgentDir(), 'approvals');
const DEFAULT_APPROVALS_PATH = path.join(APPROVALS_DIR, 'global.json');

export const APPROVABLE_TOOLS = ['execute_bash', 'write_file', 'edit_file'] as const;

type ApprovableToolName = (typeof APPROVABLE_TOOLS)[number];

interface ApprovalPreferences {
    execute_bash?: boolean;
    write_file?: boolean;
    edit_file?: boolean;
}

export class ApprovalStore {
    private path: string;
    private cached: ApprovalPreferences | null = null;

    constructor(filePath?: string) {
        this.path = filePath ?? DEFAULT_APPROVALS_PATH;
    }

    private readPreferences(): ApprovalPreferences {
        if (this.cached) return this.cached;
        this.cached = readJsonFile<ApprovalPreferences>(this.path) ?? {};
        return this.cached;
    }

    private writePreferences(prefs: ApprovalPreferences): void {
        writeJsonFile(this.path, prefs);
        this.cached = prefs;
    }

    isToolApproved(toolName: string): boolean {
        const prefs = this.readPreferences();
        return prefs[toolName as ApprovableToolName] === true;
    }

    setToolApproval(toolName: string, approved: boolean): void {
        const prefs = this.readPreferences();
        prefs[toolName as ApprovableToolName] = approved;
        this.writePreferences(prefs);
    }

    /** 批量设置工具审批状态（单次读写） */
    setToolApprovals(entries: Array<{ toolName: string; approved: boolean }>): void {
        const prefs = this.readPreferences();
        for (const { toolName, approved } of entries) {
            prefs[toolName as ApprovableToolName] = approved;
        }
        this.writePreferences(prefs);
    }

    clearAllApprovals(): void {
        this.writePreferences({});
    }

    getApprovalSummary(): Record<string, boolean> {
        const prefs = this.readPreferences();
        const summary: Record<string, boolean> = {};
        for (const tool of APPROVABLE_TOOLS) {
            summary[tool] = prefs[tool] === true;
        }
        return summary;
    }
}

export const defaultStore = new ApprovalStore();

const storeContext = new AsyncLocalStorage<ApprovalStore>();

function getCurrentStore(): ApprovalStore {
    return storeContext.getStore() ?? defaultStore;
}

export function withStore<T>(store: ApprovalStore, fn: () => T): T {
    return storeContext.run(store, fn);
}

export function isToolApproved(toolName: string): boolean {
    return getCurrentStore().isToolApproved(toolName);
}

export function setToolApproval(toolName: string, approved: boolean): void {
    getCurrentStore().setToolApproval(toolName, approved);
}

export function clearAllApprovals(): void {
    getCurrentStore().clearAllApprovals();
}

export function getApprovalSummary(): Record<string, boolean> {
    return getCurrentStore().getApprovalSummary();
}
