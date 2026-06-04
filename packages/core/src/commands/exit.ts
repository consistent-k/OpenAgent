import { channelManager } from '@oagent/channels';
import { t } from '@oagent/i18n';
import type { SlashCommand } from './registry';

export const exitCommand: SlashCommand = {
    name: '/exit',
    getDescription: () => t('command.exit.description'),
    run: async ({ saveCurrentSession, exit }) => {
        await saveCurrentSession();
        // 停止所有 channel，释放连接，否则进程无法退出
        try {
            await channelManager.stopAll();
        } catch {
            // ignore
        }
        exit();
    }
};
