import { t } from '@oagent/i18n';
import { uid } from '../utils/uid';
import { runUpdate } from '../utils/update';
import type { SlashCommand } from './registry';

export const updateCommand: SlashCommand = {
    name: '/update',
    getDescription: () => t('command.update.description'),
    run: async ({ rawInput, appendMessages }) => {
        appendMessages([
            { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
            { id: uid(), role: 'assistant', parts: [{ type: 'text', text: t('command.update.checking'), state: 'done' }] }
        ]);

        try {
            const result = await runUpdate();
            appendMessages([
                {
                    id: uid(),
                    role: 'assistant',
                    parts: [{ type: 'text', text: result.message, state: 'done' }]
                }
            ]);
        } catch (err) {
            appendMessages([
                {
                    id: uid(),
                    role: 'assistant',
                    parts: [{ type: 'text', text: `⚠️ ${t('command.update.failed', { error: err instanceof Error ? err.message : String(err) })}`, state: 'done' }]
                }
            ]);
        }
    }
};
