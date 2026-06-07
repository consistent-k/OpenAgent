import { getLocale, getSupportedLocales, t } from '@oagent/i18n';
import { reloadConfig, saveLocale } from '../config';
import { uid } from '../utils/uid';
import type { SlashCommand } from './registry';

export const localeCommand: SlashCommand = {
    name: '/locale',
    getDescription: () => t('command.locale.description'),
    run: ({ rawInput, args, appendMessages }) => {
        const lines: string[] = [];
        const supportedLocales = getSupportedLocales();

        if (args.length === 0) {
            // 显示当前语言和可用列表
            const currentCode = getLocale();
            const current = supportedLocales.find((l) => l.code === currentCode);
            lines.push(t('command.locale.current', { locale: current?.label ?? currentCode }));
            lines.push(
                t('command.locale.available', {
                    locales: supportedLocales.map((l) => (l.source === 'built-in' ? `${l.code} (${l.label})` : `${l.code} (${l.label}) [${l.source}]`)).join(', ')
                })
            );
        } else {
            const target = args[0];
            const found = supportedLocales.find((l) => l.code === target);
            if (!found) {
                lines.push(
                    t('command.locale.unknown', {
                        locale: target,
                        locales: supportedLocales.map((l) => l.code).join(', ')
                    })
                );
            } else {
                saveLocale(target);
                reloadConfig();
                lines.push(t('command.locale.switched', { locale: found.label }));
            }
        }

        appendMessages([
            { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
            { id: uid(), role: 'assistant', parts: [{ type: 'text', text: lines.join('\n'), state: 'done' }] }
        ]);
    }
};
