import { tool } from 'ai';
import { z } from 'zod';
import { writeFileContent } from './shared';

export const writeFileTool = tool({
    description: '向工作目录内文件写入完整文本内容。默认不覆盖已有文件（安全优先），如需覆盖请显式设置 overwrite=true。也可用于创建新文件和父目录。',
    needsApproval: true,
    inputSchema: z.object({
        path: z.string().describe('工作目录内的相对文件路径，不能指向目录或工作目录外路径'),
        content: z.string().describe('要写入文件的完整文本内容，会成为文件的新内容'),
        overwrite: z.boolean().optional().describe('文件已存在时是否允许覆盖；默认 false，避免误覆盖已有文件')
    }),
    execute: async ({ path: filePath, content, overwrite }) => {
        return writeFileContent(filePath, content, overwrite ?? false);
    }
});
