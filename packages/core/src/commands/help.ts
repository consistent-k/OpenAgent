import { t } from '@oagent/i18n';
import { uid } from '../utils/uid';
import type { SlashCommand } from './registry';

export const helpCommand: SlashCommand = {
    name: '/help',
    getDescription: () => t('command.help.description'),
    run: ({ rawInput, args, appendMessages, listCommands }) => {
        const commands = listCommands();
        const target = args[0] ? commands.find((c) => c.name === args[0]) : undefined;
        const helpText = target ? `${target.name} - ${target.getDescription()}` : commands.map((c) => `${c.name} - ${c.getDescription()}`).join('\n');
        appendMessages([
            { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
            { id: uid(), role: 'assistant', parts: [{ type: 'text', text: target ? helpText : t('command.help.availableCommands', { helpText }), state: 'done' }] }
        ]);
    }
};
