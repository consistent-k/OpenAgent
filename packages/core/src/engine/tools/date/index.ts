import { tool } from 'ai';
import { z } from 'zod';

export const dateTool = tool({
    description:
        'Get the current date and time information.\n\n' +
        '- Use this tool when users ask about time, date, or time-related queries\n' +
        '- Returns current date, time, timezone, and day of week\n' +
        '- Always use this tool before answering time-sensitive questions',
    inputSchema: z.object({}),
    execute: async () => {
        const now = new Date();

        return {
            iso: now.toISOString(),
            date: now.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }),
            time: now.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            dayOfWeek: now.toLocaleDateString('zh-CN', { weekday: 'long' }),
            timestamp: now.getTime()
        };
    }
});
