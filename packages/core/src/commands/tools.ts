import { tools } from '../engine/tools';
import { uid } from '../utils/uid';
import type { SlashCommand } from './registry';

export const toolsCommand: SlashCommand = {
    name: '/tools',
    description: '列出 Agent 可调用的内置工具',
    run: ({ rawInput, appendMessages }) => {
        const toolNames = Object.keys(tools)
            .map((name) => `- ${name}`)
            .join('\n');
        appendMessages([
            { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
            { id: uid(), role: 'assistant', parts: [{ type: 'text', text: `可用工具：\n${toolNames}`, state: 'done' }] }
        ]);
    }
};
