import { t } from '@oagent/i18n';
import { listSessions } from '../utils/sessions';
import { uid } from '../utils/uid';
import type { SlashCommand } from './registry';

export const sessionsCommand: SlashCommand = {
    name: '/sessions',
    getDescription: () => t('command.sessions.description'),
    run: async ({ rawInput, cwd, appendMessages, showSessionPicker }) => {
        const sessions = await listSessions(cwd);
        if (sessions.length === 0) {
            appendMessages([
                { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
                { id: uid(), role: 'assistant', parts: [{ type: 'text', text: t('command.sessions.noSavedSessions'), state: 'done' }] }
            ]);
            return;
        }
        showSessionPicker(sessions);
    }
};
