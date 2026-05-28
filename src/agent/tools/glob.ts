import fs from 'node:fs/promises';
import path from 'node:path';
import { tool } from 'ai';
import { z } from 'zod';
import { SKIP_DIRS } from '../../config';
import { ROOT_DIR, resolveSafePath } from '@/utils/safe-path';

const MAX_MATCHES = 200;

function toPosixPath(filePath: string): string {
    return filePath.split(path.sep).join('/');
}

function assertSafePattern(pattern: string): void {
    if (path.isAbsolute(pattern)) {
        throw new Error('glob 模式必须是相对路径');
    }
    if (pattern.split(/[\\/]+/).includes('..')) {
        throw new Error('glob 模式不能包含上级目录引用');
    }
}

function escapeRegexChar(char: string): string {
    return /[\\^$+?.()|{}[\]]/.test(char) ? `\\${char}` : char;
}

function globToRegex(glob: string): RegExp {
    const normalized = glob.replace(/\\/g, '/');
    let regexStr = '';

    for (let i = 0; i < normalized.length; i += 1) {
        const char = normalized[i];
        const next = normalized[i + 1];
        const afterNext = normalized[i + 2];

        if (char === '*' && next === '*' && afterNext === '/') {
            regexStr += '(?:.*/)?';
            i += 2;
        } else if (char === '*' && next === '*') {
            regexStr += '.*';
            i += 1;
        } else if (char === '*') {
            regexStr += '[^/]*';
        } else if (char === '?') {
            regexStr += '[^/]';
        } else {
            regexStr += escapeRegexChar(char);
        }
    }

    return new RegExp(`^${regexStr}$`);
}

export const globTool = tool({
    description: '在工作目录内按 glob 模式查找文件路径，返回匹配的相对路径；支持 *、?、**。用于按文件名/路径模式找文件，不读取文件内容。',
    inputSchema: z.object({
        pattern: z.string().describe('相对 glob 模式，不能是绝对路径或包含 ..，如 "**/*.ts" 或 "src/**/*.md"'),
        path: z.string().optional().describe('工作目录内的相对起始目录，默认为当前工作目录')
    }),
    execute: async ({ pattern, path: searchDir }) => {
        assertSafePattern(pattern);
        const rootDir = searchDir ? resolveSafePath(searchDir) : ROOT_DIR;
        const regex = globToRegex(pattern);
        const results: string[] = [];

        async function walkDir(dir: string): Promise<void> {
            if (results.length >= MAX_MATCHES) return;
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
                const entryPath = path.join(dir, entry.name);
                // 使用 lstat 避免跟随 symlink
                const lstat = await fs.lstat(entryPath);
                if (lstat.isDirectory()) {
                    await walkDir(entryPath);
                } else if (lstat.isFile()) {
                    const relativePath = toPosixPath(path.relative(rootDir, entryPath));
                    if (regex.test(relativePath)) {
                        results.push(relativePath);
                        if (results.length >= MAX_MATCHES) return;
                    }
                }
            }
        }

        await walkDir(rootDir);

        return {
            pattern,
            path: searchDir || '.',
            matches: results.sort(),
            totalMatches: results.length,
            truncated: results.length >= MAX_MATCHES
        };
    }
});
