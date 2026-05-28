import type { ThemeName } from '../ui/text/theme';
import { uid } from '../utils/uid';
import type { SlashCommand } from './registry';

const THEME_NAMES: ThemeName[] = ['dark', 'light', '5525', 'bubu'];

export const themeCommand: SlashCommand = {
    name: '/theme',
    description: '切换主题（无参数弹出选择，或直接指定主题名）',
    run: ({ rawInput, args, appendMessages, setThemeName, showThemePicker }) => {
        if (args.length > 0) {
            const name = args[0] as ThemeName;
            if (!THEME_NAMES.includes(name)) {
                appendMessages([
                    { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
                    { id: uid(), role: 'assistant', parts: [{ type: 'text', text: `未知主题：${name}。可用主题：${THEME_NAMES.join(', ')}`, state: 'done' }] }
                ]);
                return;
            }
            setThemeName(name);
            appendMessages([
                { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
                { id: uid(), role: 'assistant', parts: [{ type: 'text', text: `已切换到主题：${name}`, state: 'done' }] }
            ]);
            return;
        }

        showThemePicker();
    }
};
