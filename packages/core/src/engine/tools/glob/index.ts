import path from 'node:path';
import { t } from '@oagent/i18n';
import { tool } from 'ai';
import { z } from 'zod';
import { ROOT_DIR, resolveReadPath } from '@/utils/safe-path';
import { walkDirectory } from '@/utils/walk';

const MAX_MATCHES = 200;

function toPosixPath(filePath: string): string {
    return filePath.split(path.sep).join('/');
}

function assertSafePattern(pattern: string): void {
    if (path.isAbsolute(pattern)) {
        throw new Error(t('tool.glob.absolutePath'));
    }
    if (pattern.split(/[\\/]+/).includes('..')) {
        throw new Error(t('tool.glob.parentRef'));
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
        path: z.string().optional().describe('Starting directory (relative or absolute). Defaults to the working directory root.')
    }),
    execute: async ({ pattern, path: searchDir }) => {
        assertSafePattern(pattern);
        const rootDir = searchDir ? resolveReadPath(searchDir) : ROOT_DIR;
        const regex = globToRegex(pattern);
        const results: string[] = [];

        for await (const { relativePath, entry } of walkDirectory(rootDir, rootDir)) {
            if (!entry.isFile()) continue;
            const posixPath = toPosixPath(relativePath);
            if (regex.test(posixPath)) {
                results.push(posixPath);
                if (results.length >= MAX_MATCHES) break;
            }
        }

        return {
            pattern,
            path: searchDir || '.',
            matches: results.sort(),
            totalMatches: results.length,
            truncated: results.length >= MAX_MATCHES
        };
    }
});
