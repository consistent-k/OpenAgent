import type { SlashCommand } from './registry';

export const configCommand: SlashCommand = {
    name: '/config',
    description: '查看并编辑配置',
    run: ({ showConfigPicker }) => {
        showConfigPicker();
    }
};
