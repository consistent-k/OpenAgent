import fs from 'node:fs/promises';
import path from 'node:path';
import { tool } from 'ai';
import { z } from 'zod';
import { resolveSafePath } from '@/utils/safe-path';

export const readDirectoryTool = tool({
    description: '列出工作目录内某个目录的直接子项，返回文件/目录名称和类型；只看一层，不递归读取内容。用于了解目录结构。',
    inputSchema: z.object({
        path: z.string().describe('工作目录内的相对目录路径，不能是文件或工作目录外路径')
    }),
    execute: async ({ path: dirPath }) => {
        const resolved = resolveSafePath(dirPath);
        const entries = await fs.readdir(resolved, { withFileTypes: true });
        return {
            path: dirPath,
            entries: entries.map((entry) => ({
                name: entry.name,
                isDirectory: entry.isDirectory(),
                isFile: entry.isFile(),
                path: path.join(dirPath, entry.name)
            }))
        };
    }
});
