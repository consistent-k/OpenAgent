import { t } from '@oagent/i18n';
import type { SlashCommand } from './registry';

export const clearCommand: SlashCommand = {
    name: '/clear',
    getDescription: () => t('command.clear.description'),
    run: async ({ saveCurrentSession, resetSession, newSessionId }) => {
        await saveCurrentSession();
        resetSession();
        newSessionId();
    }
};
