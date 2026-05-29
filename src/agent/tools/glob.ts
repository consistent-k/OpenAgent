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
        throw new Error('glob pattern must be a relative path');
    }
    if (pattern.split(/[\\/]+/).includes('..')) {
        throw new Error('glob pattern cannot contain ".."');
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
    description:
        'Fast file pattern matching tool that works with any codebase size.\n\n' +
        '- Supports glob patterns like "**/*.js" or "src/**/*.ts"\n' +
        '- Returns matching file paths sorted alphabetically\n' +
        '- Use this tool when you need to find files by name patterns\n' +
        '- Does not read file contents — only finds paths by pattern',
    inputSchema: z.object({
        pattern: z.string().describe('Relative glob pattern. Cannot be absolute or contain "..". E.g., "**/*.ts" or "src/**/*.md".'),
        path: z.string().optional().describe('Relative starting directory within the working directory. Defaults to the working directory root.')
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
                // Use lstat to avoid following symlinks
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
