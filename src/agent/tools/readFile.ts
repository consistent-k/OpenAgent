import fs from 'node:fs/promises';
import { tool } from 'ai';
import { z } from 'zod';
import { resolveSafePath } from '@/utils/safe-path';

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

export const readFileTool = tool({
    description:
        'Read a file from the local filesystem. Use startLine/endLine to read a specific range of lines. Use this tool to view known file contents, not for listing directories or searching files.',
    inputSchema: z.object({
        path: z.string().describe('Relative file path within the working directory. Must be a file, not a directory.'),
        startLine: z.number().int().positive().optional().describe('Line number to start reading from (1-based). Defaults to 1.'),
        endLine: z.number().int().positive().optional().describe('Line number to end reading at (inclusive). Must be >= startLine.')
    }),
    execute: async ({ path: filePath, startLine, endLine }) => {
        if (startLine !== undefined && endLine !== undefined && endLine < startLine) {
            throw new Error('endLine must be >= startLine');
        }

        const resolved = resolveSafePath(filePath);
        const stat = await fs.stat(resolved);
        if (!stat.isFile()) {
            throw new Error(`Path is not a file: ${filePath}`);
        }
        if (stat.size > MAX_FILE_SIZE) {
            throw new Error(`File too large (${Math.round(stat.size / 1024)}KB), exceeds ${MAX_FILE_SIZE / 1024}KB limit`);
        }

        const content = await fs.readFile(resolved, 'utf-8');
        const lines = content.split('\n');
        const start = startLine ?? 1;
        const end = endLine ?? lines.length;

        return {
            path: filePath,
            content: lines.slice(start - 1, end).join('\n'),
            startLine: start,
            endLine: Math.min(end, lines.length),
            totalLines: lines.length
        };
    }
});
