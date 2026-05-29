import { tool } from 'ai';
import { z } from 'zod';
import { writeFileContent } from './shared';

export const writeFileTool = tool({
    description:
        'Write a file to the local filesystem.\n\n' +
        'Usage:\n' +
        '- This tool will overwrite the existing file only if `overwrite` is set to true.\n' +
        '- Prefer the edit_file tool for modifying existing files — it only sends the diff. Use this tool for new files or complete rewrites.\n' +
        '- Can also create new files and parent directories as needed.',
    needsApproval: true,
    inputSchema: z.object({
        path: z.string().describe('Relative file path within the working directory. Must not point to a directory.'),
        content: z.string().describe('The complete text content to write to the file.'),
        overwrite: z.boolean().optional().describe('Whether to overwrite an existing file. Defaults to false to prevent accidental overwrites.')
    }),
    execute: async ({ path: filePath, content, overwrite }) => {
        return writeFileContent(filePath, content, overwrite ?? false);
    }
});
