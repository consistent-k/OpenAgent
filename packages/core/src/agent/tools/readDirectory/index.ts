import fs from 'node:fs/promises';
import path from 'node:path';
import { tool } from 'ai';
import { z } from 'zod';
import { resolveSafePath } from '@/utils/safe-path';

export const readDirectoryTool = tool({
    description: 'List the direct children of a directory, returning file/directory names and types. Non-recursive — only lists one level deep. Use this to understand directory structure.',
    inputSchema: z.object({
        path: z.string().describe('Relative directory path within the working directory. Must be a directory, not a file.')
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
