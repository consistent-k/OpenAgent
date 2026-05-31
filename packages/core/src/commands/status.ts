import { uid } from '../utils/uid';
import type { SlashCommand } from './registry';

export const statusCommand: SlashCommand = {
    name: '/status',
    description: '显示当前工作目录、文件索引数量和会话状态',
    run: ({ rawInput, cwd, fileIndexCount, messages, pendingApproval, appendMessages }) => {
        appendMessages([
            { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
            {
                id: uid(),
                role: 'assistant',
                parts: [
                    {
                        type: 'text',
                        text: [
                            `工作目录：${cwd}`,
                            `文件索引：${fileIndexCount} 项`,
                            `消息数：${messages.length}`,
                            `待确认工具：${pendingApproval ? '有' : '无'}`,
                            '提示：工具创建或删除文件后，可运行 /reload 刷新 @文件 补全'
                        ].join('\n'),
                        state: 'done'
                    }
                ]
            }
        ]);
    }
};
