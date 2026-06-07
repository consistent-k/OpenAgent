import { t } from '@oagent/i18n';
import { reloadAgents, resetSystemPromptCache } from '../engine';
import { uid } from '../utils/uid';
import type { SlashCommand } from './registry';

export const reloadCommand: SlashCommand = {
    name: '/reload',
    getDescription: () => t('command.reload.description'),
    run: async ({ rawInput, appendMessages, reloadFileIndex }) => {
        appendMessages([
            { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
            { id: uid(), role: 'assistant', parts: [{ type: 'text', text: t('command.reload.refreshing'), state: 'done' }] }
        ]);
        const count = await reloadFileIndex();

        // Reload agents and reset system prompt cache
        await reloadAgents();
        resetSystemPromptCache();

        appendMessages([{ id: uid(), role: 'assistant', parts: [{ type: 'text', text: t('command.reload.refreshed', { count }), state: 'done' }] }]);
    }
};
