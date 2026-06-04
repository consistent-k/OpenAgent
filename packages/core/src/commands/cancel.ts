import { t } from '@oagent/i18n';
import { uid } from '../utils/uid';
import type { SlashCommand } from './registry';

export const cancelCommand: SlashCommand = {
    name: '/cancel',
    getDescription: () => t('command.cancel.description'),
    run: ({ rawInput, appendMessages, cancelResponse }) => {
        appendMessages([{ id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] }]);
        cancelResponse();
    }
};
