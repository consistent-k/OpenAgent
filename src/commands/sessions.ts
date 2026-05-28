import { listSessions } from '../utils/sessions';
import { uid } from '../utils/uid';
import type { SlashCommand } from './registry';

export const sessionsCommand: SlashCommand = {
    name: '/sessions',
    description: '列出并选择已保存的会话进行恢复',
    run: async ({ rawInput, cwd, appendMessages, showSessionPicker }) => {
        const sessions = await listSessions(cwd);
        if (sessions.length === 0) {
            appendMessages([
                { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
                { id: uid(), role: 'assistant', parts: [{ type: 'text', text: '暂无已保存会话。', state: 'done' }] }
            ]);
            return;
        }
        showSessionPicker(sessions);
    }
};
