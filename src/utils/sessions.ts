import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import type { ModelMessage, UIMessage } from 'ai';

const execFileAsync = promisify(execFile);
const SESSION_VERSION = 1;

let cachedBranch: string | null = null;

export interface SavedSession {
    version: number;
    name: string;
    cwd: string;
    branch: string;
    savedAt: string;
    messages: ModelMessage[];
    displayMessages: UIMessage[];
}

export interface SessionSummary {
    name: string;
    savedAt: string;
    cwd: string;
    branch: string;
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

export function clearBranchCache(): void {
    cachedBranch = null;
}

function sanitizeName(name: string): string {
    return (
        name
            .replace(/[^a-zA-Z0-9._-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 80) || 'unknown'
    );
}

function cwdHash(cwd: string): string {
    return createHash('sha256').update(path.resolve(cwd)).digest('hex').slice(0, 8);
}

async function sessionDir(cwd: string): Promise<string> {
    const projectName = sanitizeName(path.basename(path.resolve(cwd)));
    const branch = sanitizeName(await getBranch());
    const hash = cwdHash(cwd);
    const base = path.join(os.homedir(), '.openagent', 'sessions');
    const newDir = path.join(base, `${projectName}-${hash}+${branch}`);

    // Migrate old directory format (projectName+branch → projectName-hash+branch)
    const oldDir = path.join(base, `${projectName}+${branch}`);
    try {
        await fs.access(oldDir);
        try {
            await fs.access(newDir);
        } catch {
            await fs.rename(oldDir, newDir);
        }
    } catch {
        // old dir doesn't exist, fine
    }

    return newDir;
}

async function sessionPath(cwd: string, name: string): Promise<string> {
    return path.join(await sessionDir(cwd), `${name}.json`);
}

async function indexPath(dir: string): Promise<string> {
    return path.join(dir, 'index.json');
}

async function readIndex(dir: string): Promise<SessionSummary[]> {
    try {
        const content = await fs.readFile(await indexPath(dir), 'utf-8');
        return JSON.parse(content) as SessionSummary[];
    } catch {
        return [];
    }
}

async function writeIndex(dir: string, entries: SessionSummary[]): Promise<void> {
    await fs.writeFile(await indexPath(dir), JSON.stringify(entries, null, 2), 'utf-8');
}

export async function saveSession(cwd: string, messages: ModelMessage[], displayMessages: UIMessage[]): Promise<SavedSession> {
    const now = new Date();
    const name = now.toISOString().replace(/[:.]/g, '-');
    const branch = await getBranch();
    const session: SavedSession = {
        version: SESSION_VERSION,
        name,
        cwd: path.resolve(cwd),
        branch,
        savedAt: now.toISOString(),
        messages,
        displayMessages
    };
    const dir = await sessionDir(cwd);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(await sessionPath(cwd, name), JSON.stringify(session, null, 2), 'utf-8');

    const entries = await readIndex(dir);
    entries.unshift({ name, savedAt: session.savedAt, cwd: session.cwd, branch: session.branch });
    await writeIndex(dir, entries);

    return session;
}

export async function loadSession(cwd: string, name: string): Promise<SavedSession> {
    const content = await fs.readFile(await sessionPath(cwd, name), 'utf-8');
    const session = JSON.parse(content) as SavedSession;
    if (session.version !== SESSION_VERSION || !Array.isArray(session.messages) || !Array.isArray(session.displayMessages)) {
        throw new Error(`会话文件格式不兼容：${name}`);
    }
    return session;
}

export async function listSessions(cwd: string): Promise<SessionSummary[]> {
    const dir = await sessionDir(cwd);
    const entries = await readIndex(dir);
    if (entries.length > 0) return entries;

    // Fallback: scan files if index is missing (e.g. old sessions without index)
    let files: string[];
    try {
        files = await fs.readdir(dir);
    } catch {
        return [];
    }

    const summaries = await Promise.all(
        files
            .filter((file) => file.endsWith('.json') && file !== 'index.json')
            .map(async (file) => {
                try {
                    const content = await fs.readFile(path.join(dir, file), 'utf-8');
                    const session = JSON.parse(content) as SavedSession;
                    return {
                        name: session.name,
                        savedAt: session.savedAt,
                        cwd: session.cwd,
                        branch: session.branch
                    };
                } catch {
                    return null;
                }
            })
    );

    const result = summaries.filter((summary): summary is SessionSummary => summary !== null).sort((a, b) => b.savedAt.localeCompare(a.savedAt));

    // Migrate: write index for future reads
    if (result.length > 0) {
        await writeIndex(dir, result);
    }

    return result;
}
