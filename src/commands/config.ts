import { getConfigSummary } from '../config';
import { uid } from '../utils/uid';
import type { SlashCommand } from './registry';

export const configCommand: SlashCommand = {
    name: '/config',
    description: '显示当前模型配置摘要（会隐藏 API Key）',
    run: ({ rawInput, appendMessages }) => {
        const config = getConfigSummary();
        appendMessages([
            { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
            {
                id: uid(),
                role: 'assistant',
                parts: [
                    {
                        type: 'text',
                        text: [`baseUrl：${config.baseUrl}`, `model：${config.model}`, `maxSteps：${config.maxSteps}`, `apiKey：${config.apiKey}`].join('\n'),
                        state: 'done'
                    }
                ]
            }
        ]);
    }
};
