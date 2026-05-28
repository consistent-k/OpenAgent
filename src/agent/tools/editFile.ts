import fs from 'node:fs/promises';
import { tool } from 'ai';
import { z } from 'zod';
import { resolveSafePath } from '@/utils/safe-path';

export const editFileTool = tool({
    description:
        '对工作目录内文件进行精准文本替换。通过 old_string 定位要修改的文本片段，用 new_string 替换。比 write_file 更高效，避免重写整个文件。old_string 必须在文件中精确存在且默认唯一（replace_all 除外）。',
    needsApproval: true,
    inputSchema: z.object({
        path: z.string().describe('工作目录内的相对文件路径'),
        old_string: z.string().describe('要替换的原始文本，必须与文件内容完全匹配（含缩进和换行）'),
        new_string: z.string().describe('替换后的文本，必须与 old_string 不同'),
        replace_all: z.boolean().optional().describe('是否替换所有匹配项，默认 false（要求 old_string 在文件中唯一）')
    }),
    execute: async ({ path: filePath, old_string, new_string, replace_all }) => {
        if (old_string === new_string) {
            throw new Error('old_string 和 new_string 不能相同');
        }

        const resolved = resolveSafePath(filePath);
        const content = await fs.readFile(resolved, 'utf-8');

        const count = content.split(old_string).length - 1;
        if (count === 0) {
            throw new Error(`文件中未找到 old_string：${filePath}`);
        }

        if (!replace_all && count > 1) {
            throw new Error(`old_string 在文件中出现 ${count} 次，请使用 replace_all 或提供更精确的 old_string`);
        }

        const newContent = replace_all ? content.replaceAll(old_string, new_string) : content.replace(old_string, new_string);

        await fs.writeFile(resolved, newContent, 'utf-8');

        const totalLines = newContent.split('\n').length;
        return {
            path: filePath,
            replacements: replace_all ? count : 1,
            totalLines
        };
    }
});
