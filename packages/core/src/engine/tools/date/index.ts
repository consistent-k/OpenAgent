import { getLocale } from '@oagent/i18n';
import { tool } from 'ai';
import { z } from 'zod';

/** 将 i18n locale 代码映射为 BCP 47 tag */
function getLocaleTag(): string {
    const locale = getLocale();
    const map: Record<string, string> = { zh: 'zh-CN', en: 'en-US' };
    return map[locale] ?? locale;
}

export const dateTool = tool({
    description:
        'Get the current date and time information.\n\n' +
        '- Use this tool when users ask about time, date, or time-related queries\n' +
        '- Returns current date, time, timezone, and day of week\n' +
        '- Always use this tool before answering time-sensitive questions',
    inputSchema: z.object({}),
    execute: async () => {
        const now = new Date();
        const localeTag = getLocaleTag();

        return {
            iso: now.toISOString(),
            date: now.toLocaleDateString(localeTag, {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }),
            time: now.toLocaleTimeString(localeTag, {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            dayOfWeek: now.toLocaleDateString(localeTag, { weekday: 'long' }),
            timestamp: now.getTime()
        };
    }
});
