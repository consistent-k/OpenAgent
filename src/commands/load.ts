import { loadSession, listSessions } from '../utils/sessions';
import { uid } from '../utils/uid';
import type { SlashCommand } from './registry';

export const loadCommand: SlashCommand = {
    name: '/load',
    description: '恢复已保存会话；用法：/load [名称]，无参数时列出可用会话',
    run: async ({ rawInput, args, cwd, appendMessages, setSession, saveCurrentSession }) => {
        if (args.length === 0) {
            const sessions = await listSessions(cwd);
            const text = sessions.length === 0 ? '暂无已保存会话。用法：/load [会话名称]' : sessions.map((s) => `- ${s.name} (${new Date(s.savedAt).toLocaleString()})`).join('\n');
            appendMessages([
                { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
                { id: uid(), role: 'assistant', parts: [{ type: 'text', text: sessions.length === 0 ? text : `可用会话：\n${text}\n\n用法：/load [会话名称]`, state: 'done' }] }
            ]);
            return;
        }
        await saveCurrentSession();
        const name = args[0];
        const session = await loadSession(cwd, name);
        setSession(session.messages, session.displayMessages);
        appendMessages([
            { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
            { id: uid(), role: 'assistant', parts: [{ type: 'text', text: `已恢复会话：${session.name}`, state: 'done' }] }
        ]);
    }
};
