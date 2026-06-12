import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFileAsync } from '@/utils/exec';
import { walkDirectory } from '@/utils/walk';
const MAX_INDEX_ENTRIES = 5000;

export interface FileEntry {
    path: string;
    type: 'file' | 'dir';
}

async function loadFromGit(cwd: string): Promise<string[] | null> {
    try {
        // 添加 timeout 防止 git 进程挂起（如等待输入密码）
        const { stdout } = await execFileAsync('git', ['ls-files'], { cwd, maxBuffer: 50 * 1024 * 1024, timeout: 10_000 });
        return stdout
            .split('\n')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
    } catch {
        return null;
    }
}

async function walkFs(cwd: string): Promise<FileEntry[]> {
    const out: FileEntry[] = [];
    for await (const { relativePath, entry } of walkDirectory(cwd, cwd, { filterHidden: false })) {
        if (out.length >= MAX_INDEX_ENTRIES) break;
        out.push({ path: relativePath, type: entry.isDirectory() ? 'dir' : 'file' });
    }
    return out;
}

function deriveDirsFromFiles(filePaths: string[]): string[] {
    const dirs = new Set<string>();
    for (const p of filePaths) {
        const parts = p.split('/');
        for (let i = 1; i < parts.length; i++) {
            const dir = parts.slice(0, i).join('/');
            if (dir.length > 0) dirs.add(dir);
        }
    }
    return Array.from(dirs);
}

export async function loadFileIndex(cwd: string): Promise<FileEntry[]> {
    const files = await loadFromGit(cwd);
    let entries: FileEntry[];
    if (files !== null) {
        const fileEntries: FileEntry[] = files.map((p) => ({ path: p, type: 'file' as const }));
        const dirEntries: FileEntry[] = deriveDirsFromFiles(files).map((p) => ({ path: p, type: 'dir' as const }));
        entries = [...fileEntries, ...dirEntries];
    } else {
        try {
            entries = await walkFs(cwd);
        } catch {
            entries = [];
        }
    }
    entries.sort((a, b) => a.path.localeCompare(b.path));
    return entries.slice(0, MAX_INDEX_ENTRIES);
}

function basename(p: string): string {
    const i = p.lastIndexOf('/');
    return i < 0 ? p : p.slice(i + 1);
}

function stripExtension(name: string): string {
    const i = name.lastIndexOf('.');
    return i <= 0 ? name : name.slice(0, i);
}

export function filterFiles(index: FileEntry[], query: string, limit = 20): FileEntry[] {
    if (!query) return index.slice(0, limit);
    const q = query.toLowerCase();
    const scored: { entry: FileEntry; baseHit: number; baseIdx: number; baseQuality: number }[] = [];
    for (const entry of index) {
        const lp = entry.path.toLowerCase();
        if (!lp.includes(q)) continue;
        const lb = basename(lp);
        const bIdx = lb.indexOf(q);
        const stem = stripExtension(lb);
        const baseQuality = stem === q ? 0 : lb === q ? 1 : stem.startsWith(q) ? 2 : lb.startsWith(q) ? 3 : 4;
        scored.push({ entry, baseHit: bIdx >= 0 ? 0 : 1, baseIdx: bIdx >= 0 ? bIdx : Number.MAX_SAFE_INTEGER, baseQuality });
    }
    scored.sort((a, b) => {
        if (a.baseHit !== b.baseHit) return a.baseHit - b.baseHit;
        if (a.baseIdx !== b.baseIdx) return a.baseIdx - b.baseIdx;
        if (a.baseQuality !== b.baseQuality) return a.baseQuality - b.baseQuality;
        if (a.entry.path.length !== b.entry.path.length) return a.entry.path.length - b.entry.path.length;
        return a.entry.path.localeCompare(b.entry.path);
    });
    return scored.slice(0, limit).map((s) => s.entry);
}

export function getActiveMention(value: string): { start: number; query: string } | null {
    const at = value.lastIndexOf('@');
    if (at < 0) return null;
    if (at > 0) {
        const prev = value[at - 1];
        if (prev !== ' ' && prev !== '\n' && prev !== '\t') return null;
    }
    const tail = value.slice(at + 1);
    if (/\s/.test(tail)) return null;
    return { start: at, query: tail };
}

export async function expandMentions(text: string, index: FileEntry[], cwd: string): Promise<string> {
    const re = /(^|\s)@([^\s]+)/g;
    const byPath = new Map<string, FileEntry>();
    for (const e of index) byPath.set(e.path, e);

    type Match = { full: string; lead: string; token: string; idx: number };
    const matches: Match[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
        matches.push({ full: m[0], lead: m[1], token: m[2], idx: m.index });
    }

    const replacements = await Promise.all(
        matches.map(async (mt) => {
            const entry = byPath.get(mt.token);
            if (!entry || entry.type !== 'file') return null;
            try {
                const resolved = path.resolve(cwd, mt.token);
                // 防止路径穿越：解析后的路径必须在 cwd 内
                if (!resolved.startsWith(cwd + path.sep) && resolved !== cwd) return null;
                const content = await fs.readFile(resolved, 'utf-8');
                return `${mt.lead}<file path="${mt.token}">\n${content}\n</file>`;
            } catch {
                return null;
            }
        })
    );

    let out = '';
    let cursor = 0;
    for (let i = 0; i < matches.length; i++) {
        const mt = matches[i];
        out += text.slice(cursor, mt.idx);
        const rep = replacements[i];
        if (rep !== null) {
            out += rep;
        } else {
            out += mt.full;
        }
        cursor = mt.idx + mt.full.length;
    }
    out += text.slice(cursor);
    return out;
}
