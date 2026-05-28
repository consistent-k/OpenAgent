import fs from 'node:fs/promises';
import path from 'node:path';
import { tool } from 'ai';
import { z } from 'zod';
import { SKIP_DIRS } from '../../config';
import { resolveSafePath, ROOT_DIR } from '@/utils/safe-path';

const DEFAULT_MAX_MATCHES = 200;
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

/** 简易 glob 匹配，支持 * 和 ? */
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
    description: '在工作目录内的文件或目录中搜索文本内容。支持正则表达式、上下文行显示、文件 glob 过滤和多种输出模式。用于查找代码中的关键字、函数引用、配置项等。',
    inputSchema: z.object({
        pattern: z.string().describe('要搜索的关键词或 JavaScript 正则表达式模式'),
        path: z.string().describe('工作目录内的相对文件或目录路径'),
        caseSensitive: z.boolean().optional().describe('是否区分大小写，默认 true'),
        recursive: z.boolean().optional().describe('path 是目录时是否递归搜索全部子目录，默认 false'),
        glob: z.string().optional().describe('文件名 glob 过滤，如 "*.ts"、"*.json"，仅在目录搜索时生效'),
        context: z.number().int().min(0).max(20).optional().describe('匹配行前后各显示 N 行上下文，默认 0'),
        head_limit: z.number().int().min(1).optional().describe('限制返回总匹配行数，默认 200'),
        output_mode: z
            .enum(['content', 'files_with_matches', 'count'])
            .optional()
            .describe('输出模式：content 返回匹配行（默认），files_with_matches 只返回包含匹配的文件路径，count 返回每个文件的匹配计数')
    }),
    execute: async ({ pattern, path: searchPath, caseSensitive = true, recursive = false, glob, context = 0, head_limit, output_mode = 'content' }) => {
        const maxMatches = head_limit ?? DEFAULT_MAX_MATCHES;
        const resolved = resolveSafePath(searchPath);
        const stat = await fs.stat(resolved);

        const flags = caseSensitive ? '' : 'i';
        let regex: RegExp;
        try {
            regex = new RegExp(pattern, flags);
        } catch (error) {
            throw new Error(`无效正则表达式：${error instanceof Error ? error.message : String(error)}`);
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
            const entries = await fs.readdir(dir, { withFileTypes: true });

            for (const entry of entries) {
                if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
                if (glob && !matchesGlob(entry.name, glob)) continue;

                const entryPath = path.join(dir, entry.name);
                const relPath = path.relative(ROOT_DIR, entryPath);

                if (entry.isFile()) {
                    const result = await searchSingleFile(entryPath, relPath);
                    if (result) {
                        results.push(result);
                        totalLines += result.matches.length;
                        if (totalLines >= maxMatches) {
                            // 截断最后文件的多余匹配
                            const excess = totalLines - maxMatches;
                            if (excess > 0) {
                                result.matches = result.matches.slice(0, result.matches.length - excess);
                            }
                            return results;
                        }
                    }
                } else if (entry.isDirectory() && recursive) {
                    const sub = await searchDirectory(entryPath);
                    results.push(...sub);
                    totalLines = results.reduce((sum, r) => sum + r.matches.length, 0);
                    if (totalLines >= maxMatches) return results;
                }
            }

            return results;
        }

        if (stat.isFile()) {
            const lines = await loadLines(resolved);
            if (!lines) throw new Error(`无法读取文件：${searchPath}`);

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

        throw new Error(`路径不存在或不是文件/目录：${searchPath}`);
    }
});
