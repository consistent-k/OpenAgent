import fs from 'node:fs/promises';
import { tool } from 'ai';
import { z } from 'zod';
import { resolveSafePath } from '@/utils/safe-path';

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

export const readFileTool = tool({
    description: '读取工作目录内的 UTF-8 文本文件内容；可用 startLine/endLine 只读取指定行段。用于查看已知文件内容，不用于列目录或搜索文件。',
    inputSchema: z.object({
        path: z.string().describe('工作目录内的相对文件路径，不能是目录或工作目录外路径'),
        startLine: z.number().int().positive().optional().describe('从第几行开始读取，1-based，默认从第 1 行开始'),
        endLine: z.number().int().positive().optional().describe('读取到第几行结束，包含该行；必须大于等于 startLine')
    }),
    execute: async ({ path: filePath, startLine, endLine }) => {
        if (startLine !== undefined && endLine !== undefined && endLine < startLine) {
            throw new Error('endLine 不能小于 startLine');
        }

        const resolved = resolveSafePath(filePath);
        const stat = await fs.stat(resolved);
        if (!stat.isFile()) {
            throw new Error(`路径不是文件：${filePath}`);
        }
        if (stat.size > MAX_FILE_SIZE) {
            throw new Error(`文件过大（${Math.round(stat.size / 1024)}KB），超过 ${MAX_FILE_SIZE / 1024}KB 限制`);
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
