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

function expandBraces(pattern: string, depth = 0): string[] {
    // 限制递归深度，防止恶意模式导致性能问题
    const MAX_BRACE_DEPTH = 10;
    const MAX_EXPANSIONS = 1000;

    if (depth > MAX_BRACE_DEPTH) {
        return [pattern];
    }

    const start = pattern.indexOf('{');
    if (start === -1) return [pattern];

    let braceDepth = 0;
    let end = -1;
    for (let i = start; i < pattern.length; i++) {
        if (pattern[i] === '{') braceDepth++;
        if (pattern[i] === '}') {
            braceDepth--;
            if (braceDepth === 0) {
                end = i;
                break;
            }
        }
    }
    if (end === -1) return [pattern];

    const prefix = pattern.slice(0, start);
    const suffix = pattern.slice(end + 1);
    const inner = pattern.slice(start + 1, end);
    const options: string[] = [];
    let optionStart = 0;
    let innerDepth = 0;
    for (let i = 0; i < inner.length; i++) {
        if (inner[i] === '{') innerDepth++;
        if (inner[i] === '}') innerDepth--;
        if (inner[i] === ',' && innerDepth === 0) {
            options.push(inner.slice(optionStart, i));
            optionStart = i + 1;
        }
    }
    options.push(inner.slice(optionStart));

    const results: string[] = [];
    for (const opt of options) {
        for (const expanded of expandBraces(prefix + opt + suffix, depth + 1)) {
            results.push(expanded);
            // 限制展开结果数量
            if (results.length >= MAX_EXPANSIONS) {
                return results;
            }
        }
    }
    return results;
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
        } else if (char === '[') {
            // 支持字符类 [abc]，但需要转义内部的正则特殊字符
            const closeIdx = normalized.indexOf(']', i + 1);
            if (closeIdx !== -1) {
                const charClass = normalized.slice(i + 1, closeIdx);
                // 转义字符类内部的特殊正则字符（除了 ^ 和 -）
                const escaped = charClass.replace(/[\\^$+?.()|{}]/g, '\\$&');
                regexStr += `[${escaped}]`;
                i = closeIdx;
            } else {
                regexStr += escapeRegexChar(char);
            }
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
        const expandedPatterns = expandBraces(pattern);
        const regexes = expandedPatterns.map((p) => globToRegex(p));
        const results: string[] = [];

        for await (const { relativePath, entry } of walkDirectory(rootDir, rootDir)) {
            if (!entry.isFile()) continue;
            const posixPath = toPosixPath(relativePath);
            if (regexes.some((regex) => regex.test(posixPath))) {
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
