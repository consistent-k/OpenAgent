import { t } from '@oagent/i18n';
import { uid } from '../utils/uid';
import type { SlashCommand } from './registry';

export const statusCommand: SlashCommand = {
    name: '/status',
    getDescription: () => t('command.status.description'),
    run: ({ rawInput, cwd, fileIndexCount, displayMessages, pendingApproval, appendMessages }) => {
        appendMessages([
            { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
            {
                id: uid(),
                role: 'assistant',
                parts: [
                    {
                        type: 'text',
                        text: [
                            t('command.status.workingDirectory', { cwd }),
                            t('command.status.fileIndex', { count: fileIndexCount }),
                            t('command.status.messageCount', { count: displayMessages.length }),
                            pendingApproval ? t('command.status.pendingApprovalYes') : t('command.status.pendingApprovalNo'),
                            t('command.status.reloadHint')
                        ].join('\n'),
                        state: 'done'
                    }
                ]
            }
        ]);
    }
};
