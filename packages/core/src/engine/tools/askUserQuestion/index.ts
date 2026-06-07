import { tool } from 'ai';
import { z } from 'zod';

export const askUserQuestionTool = tool({
    description:
        'Ask the user a multiple-choice question with 2 or more options. Use this when you need the user to make a decision — such as confirming a direction, choosing an implementation approach, or setting preferences. Do NOT use for simple approve/reject (that is handled by tool approval).',
    inputSchema: z.object({
        question: z.string().describe('The question to ask the user.'),
        options: z.array(z.string()).min(2).describe('2 or more option texts for the user to choose from.'),
        header: z.string().optional().describe('A short label for UI display.')
    })
    // 客户端工具：无 execute，UI 通过 addToolOutput 提交用户选择
});
