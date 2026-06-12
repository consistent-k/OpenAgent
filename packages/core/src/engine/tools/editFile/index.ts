import fs from 'node:fs/promises';
import { t } from '@oagent/i18n';
import { tool } from 'ai';
import { z } from 'zod';
import { isToolApproved } from '../utils/approval-store';
import { resolveSafePath } from '@/utils/safe-path';

export const editFileTool = tool({
    description:
        'Performs exact string replacements in files.\n\n' +
        'Usage:\n' +
        '- The edit will FAIL if `old_string` is not found in the file. Ensure exact indentation and whitespace match.\n' +
        '- By default, `old_string` must be unique in the file. Use `replace_all` to replace every occurrence.\n' +
        '- Prefer this tool over write_file for modifying existing files — it only sends the diff.\n' +
        '- Use `replace_all` for replacing and renaming strings across the file (e.g., renaming a variable).',
    needsApproval: () => !isToolApproved('edit_file'),
    inputSchema: z.object({
        path: z.string().describe('Relative file path within the working directory.'),
        old_string: z.string().describe('The exact text to find and replace. Must match the file content exactly, including indentation and line breaks.'),
        new_string: z.string().describe('The replacement text. Must differ from old_string.'),
        replace_all: z.boolean().optional().describe('Replace all occurrences of old_string. Defaults to false (requires old_string to be unique in the file).')
    }),
    execute: async ({ path: filePath, old_string, new_string, replace_all }) => {
        if (old_string === new_string) {
            throw new Error(t('tool.editFile.sameStrings'));
        }

        if (old_string === '') {
            throw new Error(t('tool.editFile.emptyOldString'));
        }

        const resolved = resolveSafePath(filePath);
        const content = await fs.readFile(resolved, 'utf-8');

        let count = 0;
        let idx = content.indexOf(old_string);
        while (idx !== -1) {
            count++;
            idx = content.indexOf(old_string, idx + old_string.length);
        }
        if (count === 0) {
            throw new Error(t('tool.editFile.notFound', { filePath }));
        }

        if (!replace_all && count > 1) {
            throw new Error(t('tool.editFile.multipleMatches', { count }));
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
