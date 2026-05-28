import { uid } from '../utils/uid';
import type { SlashCommand } from './registry';

export const cancelCommand: SlashCommand = {
    name: '/cancel',
    description: '停止当前正在流式生成的回复',
    run: ({ rawInput, appendMessages, cancelResponse }) => {
        appendMessages([{ id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] }]);
        cancelResponse();
    }
};
