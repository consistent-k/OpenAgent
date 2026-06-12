import { t } from '@oagent/i18n';
import { uid } from '../utils/uid';
import type { SlashCommand } from './registry';

export const clearCommand: SlashCommand = {
    name: '/clear',
    getDescription: () => t('command.clear.description'),
    run: async ({ rawInput, saveCurrentSession, resetSession, newSessionId, appendMessages }) => {
        try {
            await saveCurrentSession();
        } catch (err) {
            // 保存失败时提示用户，但仍允许清除会话
            appendMessages([
                { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
                {
                    id: uid(),
                    role: 'assistant',
                    parts: [{ type: 'text', text: `⚠️ ${t('command.clear.saveFailed', { error: err instanceof Error ? err.message : String(err) })}`, state: 'done' }]
                }
            ]);
        }
        resetSession();
        newSessionId();
    }
};
