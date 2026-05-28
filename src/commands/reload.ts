import { uid } from '../utils/uid';
import type { SlashCommand } from './registry';

export const reloadCommand: SlashCommand = {
    name: '/reload',
    description: '重新扫描工作目录，刷新 @文件 补全索引',
    run: async ({ rawInput, appendMessages, reloadFileIndex }) => {
        appendMessages([
            { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
            { id: uid(), role: 'assistant', parts: [{ type: 'text', text: '正在刷新文件索引...', state: 'done' }] }
        ]);
        const count = await reloadFileIndex();
        appendMessages([{ id: uid(), role: 'assistant', parts: [{ type: 'text', text: `文件索引已刷新：${count} 项`, state: 'done' }] }]);
    }
};
