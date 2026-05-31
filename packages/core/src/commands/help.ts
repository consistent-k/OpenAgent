import { uid } from '../utils/uid';
import type { SlashCommand } from './registry';

export const helpCommand: SlashCommand = {
    name: '/help',
    description: '显示所有可用命令；可用 /help /命令 查看单个命令',
    run: ({ rawInput, args, appendMessages, listCommands }) => {
        const commands = listCommands();
        const target = args[0] ? commands.find((c) => c.name === args[0]) : undefined;
        const helpText = target ? `${target.name} - ${target.description}` : commands.map((c) => `${c.name} - ${c.description}`).join('\n');
        appendMessages([
            { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
            { id: uid(), role: 'assistant', parts: [{ type: 'text', text: target ? helpText : `可用命令：\n${helpText}`, state: 'done' }] }
        ]);
    }
};
