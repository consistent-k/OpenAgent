import { t } from '@oagent/i18n';
import type { ThemeName } from '../ui/text/theme';
import { uid } from '../utils/uid';
import type { SlashCommand } from './registry';

const THEME_NAMES: ThemeName[] = ['dark', 'light', 'mayday'];

export const themeCommand: SlashCommand = {
    name: '/theme',
    getDescription: () => t('command.theme.description'),
    run: ({ rawInput, args, appendMessages, setThemeName, showThemePicker }) => {
        if (args.length > 0) {
            const name = args[0] as ThemeName;
            if (!THEME_NAMES.includes(name)) {
                appendMessages([
                    { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
                    { id: uid(), role: 'assistant', parts: [{ type: 'text', text: t('command.theme.unknownTheme', { name, themes: THEME_NAMES.join(', ') }), state: 'done' }] }
                ]);
                return;
            }
            setThemeName(name);
            appendMessages([
                { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
                { id: uid(), role: 'assistant', parts: [{ type: 'text', text: t('command.theme.switched', { name }), state: 'done' }] }
            ]);
            return;
        }

        showThemePicker();
    }
};
