import { t } from '@oagent/i18n';
import type { SlashCommand } from './registry';

export const configCommand: SlashCommand = {
    name: '/config',
    getDescription: () => t('command.config.description'),
    run: ({ showConfigPicker }) => {
        showConfigPicker();
    }
};
