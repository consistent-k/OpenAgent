import type { SlashCommand } from './registry';

export const exitCommand: SlashCommand = {
    name: '/exit',
    description: '退出 TUI',
    run: async ({ saveCurrentSession, exit }) => {
        await saveCurrentSession();
        exit();
    }
};
