import { t } from '@oagent/i18n';
import { tools } from '../engine/tools';
import { uid } from '../utils/uid';
import type { SlashCommand } from './registry';

export const toolsCommand: SlashCommand = {
    name: '/tools',
    getDescription: () => t('command.tools.description'),
    run: ({ rawInput, appendMessages }) => {
        const toolNames = Object.keys(tools)
            .map((name) => `- ${name}`)
            .join('\n');
        appendMessages([
            { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
            { id: uid(), role: 'assistant', parts: [{ type: 'text', text: t('command.tools.availableTools', { toolNames }), state: 'done' }] }
        ]);
    }
};
