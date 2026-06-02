import type { SlashCommand } from './registry';

export const clearCommand: SlashCommand = {
    name: '/clear',
    description: '保存当前会话并开始新会话',
    run: async ({ saveCurrentSession, resetSession, newSessionId }) => {
        await saveCurrentSession();
        resetSession();
        newSessionId();
    }
};
