import { uid } from '../utils/uid';
import { runUpdate } from '../utils/update';
import type { SlashCommand } from './registry';

export const updateCommand: SlashCommand = {
    name: '/update',
    description: '通过 npm/pnpm/yarn 全局更新 oa 至最新版本',
    run: async ({ rawInput, appendMessages }) => {
        appendMessages([
            { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
            { id: uid(), role: 'assistant', parts: [{ type: 'text', text: '正在检查并更新 @oagent/oa ...', state: 'done' }] }
        ]);

        const result = await runUpdate();
        appendMessages([
            {
                id: uid(),
                role: 'assistant',
                parts: [{ type: 'text', text: result.message, state: 'done' }]
            }
        ]);
    }
};
