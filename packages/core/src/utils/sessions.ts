import fs from 'node:fs/promises';
import path from 'node:path';
import { t } from '@oagent/i18n';
import type { UIMessage } from 'ai';
import { getOpenAgentDir } from '@/config';
import { execFileAsync } from '@/utils/exec';

const SESSION_VERSION = 1;

let cachedBranch: string | null = null;

interface SavedSession {
    version: number;
    sessionId: string;
    savedAt: string;
    cwd: string;
    branch: string;
    displayMessages: UIMessage[];
}

export interface HistoryEntry {
    display: string;
    pastedContents: Record<string, string>;
    timestamp: number;
    project: string;
    sessionId: string;
}

export interface SessionSummary {
    sessionId: string;
    savedAt: string;
    project: string;
    firstUserMessage?: string;
}

export async function getBranch(): Promise<string> {
    if (cachedBranch !== null) return cachedBranch;
    try {
        const { stdout } = await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { timeout: 3000 });
        cachedBranch = stdout.trim();
        return cachedBranch;
    } catch {
        cachedBranch = 'default';
        return cachedBranch;
    }
}

export function formatSessionTime(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

// --- history.jsonl ---

function historyPath(): string {
    return path.join(getOpenAgentDir(), 'history.jsonl');
}

export async function appendHistory(display: string, project: string, sessionId: string): Promise<void> {
    const entry: HistoryEntry = {
        display,
        pastedContents: {},
        timestamp: Date.now(),
        project: path.resolve(project),
        sessionId
    };
    const filePath = historyPath();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.appendFile(filePath, JSON.stringify(entry) + '\n', 'utf-8');
}

async function readHistory(project?: string): Promise<HistoryEntry[]> {
    try {
        const content = await fs.readFile(historyPath(), 'utf-8');
        const lines = content.trim().split('\n').filter(Boolean);
        const entries = lines.map((line) => JSON.parse(line) as HistoryEntry);
        if (project) {
            const resolved = path.resolve(project);
            return entries.filter((e) => e.project === resolved);
        }
        return entries;
    } catch {
        return [];
    }
}

// --- session files ---

function sessionFilePath(sessionId: string): string {
    return path.join(getOpenAgentDir(), 'sessions', `${sessionId}.json`);
}

export async function saveSession(sessionId: string, cwd: string, displayMessages: UIMessage[]): Promise<SavedSession> {
    const now = new Date();
    const branch = await getBranch();
    const session: SavedSession = {
        version: SESSION_VERSION,
        sessionId,
        savedAt: now.toISOString(),
        cwd: path.resolve(cwd),
        branch,
        displayMessages
    };
    const filePath = sessionFilePath(sessionId);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(session, null, 2), 'utf-8');
    return session;
}

export async function loadSession(sessionId: string): Promise<SavedSession> {
    const content = await fs.readFile(sessionFilePath(sessionId), 'utf-8');
    const session = JSON.parse(content) as SavedSession;
    if (session.version !== SESSION_VERSION || !Array.isArray(session.displayMessages)) {
        throw new Error(t('error.session.incompatibleFormat', { sessionId }));
    }
    return session;
}

export async function deleteSession(sessionId: string): Promise<void> {
    // 删除 session 文件
    await fs.unlink(sessionFilePath(sessionId)).catch(() => {});

    // 过滤 history.jsonl 中对应条目
    try {
        const content = await fs.readFile(historyPath(), 'utf-8');
        const lines = content.trim().split('\n').filter(Boolean);
        const filtered = lines.filter((line) => {
            const entry = JSON.parse(line) as HistoryEntry;
            return entry.sessionId !== sessionId;
        });
        await fs.writeFile(historyPath(), filtered.join('\n') + (filtered.length ? '\n' : ''), 'utf-8');
    } catch {
        // history.jsonl 不存在，忽略
    }
}

export async function listSessions(cwd: string): Promise<SessionSummary[]> {
    const entries = await readHistory(cwd);

    // 按 sessionId 分组
    const groups = new Map<string, HistoryEntry[]>();
    for (const entry of entries) {
        const list = groups.get(entry.sessionId) ?? [];
        list.push(entry);
        groups.set(entry.sessionId, list);
    }

    const result: SessionSummary[] = [];
    for (const [sessionId, group] of groups) {
        // 过滤掉只含命令（/ 开头）的幽灵会话
        const hasUserMessage = group.some((e) => e.display.trim() && !e.display.trim().startsWith('/'));
        if (!hasUserMessage) continue;

        // firstUserMessage 取第一条非命令消息
        const firstUserEntry = group.find((e) => e.display.trim() && !e.display.trim().startsWith('/'));
        const latestTimestamp = Math.max(...group.map((e) => e.timestamp));

        result.push({
            sessionId,
            savedAt: new Date(latestTimestamp).toISOString(),
            project: path.resolve(cwd),
            firstUserMessage: firstUserEntry?.display.trim().slice(0, 80)
        });
    }

    return result.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}
