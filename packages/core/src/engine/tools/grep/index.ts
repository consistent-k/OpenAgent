import fs from 'node:fs/promises';
import { tool } from 'ai';
import { z } from 'zod';
import { MAX_FILE_SIZE } from '@/config';
import { getErrorMessage } from '@/utils/errors';
import { resolveReadPath, ROOT_DIR } from '@/utils/safe-path';
import { walkDirectory } from '@/utils/walk';

const DEFAULT_MAX_MATCHES = 200;

/** Simple glob matching, supports * and ? */
function matchesGlob(filename: string, pattern: string): boolean {
    const regexStr = pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*/g, '{{GLOBSTAR}}')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '[^/]')
        .replace(/\{\{GLOBSTAR\}\}/g, '.*');
    return new RegExp(`^${regexStr}$`).test(filename);
}

interface LineMatch {
    lineNumber: number;
    content: string;
}

interface FileMatchResult {
    file: string;
    matches: LineMatch[];
    matchCount: number;
}

async function searchFileLines(filePath: string, regex: RegExp, context: number, lines: string[]): Promise<LineMatch[]> {
    const matchingIndices: number[] = [];
    lines.forEach((line, i) => {
        if (regex.test(line)) matchingIndices.push(i);
    });

    if (matchingIndices.length === 0) return [];

    if (context === 0) {
        return matchingIndices.map((i) => ({ lineNumber: i + 1, content: lines[i]! }));
    }

    const included = new Set<number>();
    const result: LineMatch[] = [];
    for (const idx of matchingIndices) {
        for (let j = Math.max(0, idx - context); j <= Math.min(lines.length - 1, idx + context); j++) {
            if (!included.has(j)) {
                included.add(j);
                result.push({ lineNumber: j + 1, content: lines[j]! });
            }
        }
    }
    return result;
}

export const grepTool = tool({
    description:
        'A powerful search tool for finding text content in files.\n\n' +
        'Usage:\n' +
        '- Supports full regex syntax (e.g., "log.*Error", "function\\\\s+\\\\w+")\n' +
        '- Filter files with glob parameter (e.g., "*.js", "**/*.tsx")\n' +
        '- Output modes: "content" shows matching lines (default), "files_with_matches" shows only file paths, "count" shows match counts\n' +
        '- Use for finding keywords, function references, configuration values in code',
    inputSchema: z.object({
        pattern: z.string().describe('Keyword or JavaScript regex pattern to search for'),
        path: z.string().describe('File or directory path (relative or absolute)'),
        caseSensitive: z.boolean().optional().describe('Whether the search is case-sensitive. Defaults to true.'),
        recursive: z.boolean().optional().describe('When path is a directory, whether to search all subdirectories recursively. Defaults to false.'),
        glob: z.string().optional().describe('File name glob filter (e.g., "*.ts", "*.json"). Only applies when searching directories.'),
        context: z.number().int().min(0).max(20).optional().describe('Number of context lines to show before and after each match. Defaults to 0.'),
        head_limit: z.number().int().min(1).optional().describe('Maximum total number of matching lines to return. Defaults to 200.'),
        output_mode: z
            .enum(['content', 'files_with_matches', 'count'])
            .optional()
            .describe('Output mode: "content" returns matching lines (default), "files_with_matches" returns only file paths with matches, "count" returns match counts per file.')
    }),
    execute: async ({ pattern, path: searchPath, caseSensitive = true, recursive = false, glob, context = 0, head_limit, output_mode = 'content' }) => {
        const maxMatches = head_limit ?? DEFAULT_MAX_MATCHES;
        const resolved = resolveReadPath(searchPath);
        const stat = await fs.stat(resolved);

        const flags = caseSensitive ? '' : 'i';
        let regex: RegExp;
        try {
            regex = new RegExp(pattern, flags);
        } catch (error) {
            throw new Error(`Invalid regex pattern: ${getErrorMessage(error)}`);
        }

        async function loadLines(filePath: string): Promise<string[] | null> {
            try {
                const content = await fs.readFile(filePath, 'utf-8');
                return content.split('\n');
            } catch {
                return null;
            }
        }

        async function searchSingleFile(filePath: string, relPath: string): Promise<FileMatchResult | null> {
            const fileStat = await fs.stat(filePath);
            if (fileStat.size > MAX_FILE_SIZE) return null;

            const lines = await loadLines(filePath);
            if (!lines) return null;

            const matches = await searchFileLines(filePath, regex, context, lines);
            if (matches.length === 0) return null;

            return { file: relPath, matches, matchCount: matches.filter((m) => regex.test(m.content)).length || matches.length };
        }

        async function searchDirectory(dir: string): Promise<FileMatchResult[]> {
            const results: FileMatchResult[] = [];
            let totalLines = 0;

            for await (const { relativePath, fullPath, entry } of walkDirectory(dir, ROOT_DIR, {
                shouldRecurse: () => recursive
            })) {
                if (!entry.isFile()) continue;
                if (glob && !matchesGlob(entry.name, glob)) continue;

                const result = await searchSingleFile(fullPath, relativePath);
                if (result) {
                    results.push(result);
                    totalLines += result.matches.length;
                    if (totalLines >= maxMatches) {
                        const excess = totalLines - maxMatches;
                        if (excess > 0) {
                            result.matches = result.matches.slice(0, result.matches.length - excess);
                        }
                        return results;
                    }
                }
            }

            return results;
        }

        if (stat.isFile()) {
            const lines = await loadLines(resolved);
            if (!lines) throw new Error(`Cannot read file: ${searchPath}`);

            const matches = await searchFileLines(resolved, regex, context, lines);

            if (output_mode === 'files_with_matches') {
                return { path: searchPath, pattern, files: matches.length > 0 ? [searchPath] : [], totalFiles: matches.length > 0 ? 1 : 0 };
            }
            if (output_mode === 'count') {
                const count = lines.filter((l) => regex.test(l)).length;
                return { path: searchPath, pattern, counts: [{ file: searchPath, count }], totalCount: count };
            }

            const truncated = matches.length > maxMatches;
            const limited = matches.slice(0, maxMatches);
            return { path: searchPath, pattern, matches: limited, totalMatches: limited.length, truncated };
        }

        if (stat.isDirectory()) {
            const results = await searchDirectory(resolved);

            if (output_mode === 'files_with_matches') {
                const files = results.map((r) => r.file);
                return { path: searchPath, pattern, files, totalFiles: files.length };
            }
            if (output_mode === 'count') {
                const counts = results.map((r) => ({ file: r.file, count: r.matches.length }));
                const totalCount = counts.reduce((s, c) => s + c.count, 0);
                return { path: searchPath, pattern, counts, totalCount };
            }

            const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);
            return { path: searchPath, pattern, results, totalMatches, truncated: totalMatches >= maxMatches };
        }

        throw new Error(`Path does not exist or is not a file/directory: ${searchPath}`);
    }
});
