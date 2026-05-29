import { tool } from 'ai';
import { z } from 'zod';

export const askUserQuestionTool = tool({
    description:
        'Ask the user a multiple-choice question with 2-4 options. Use this when you need the user to make a decision — such as confirming a direction, choosing an implementation approach, or setting preferences. Do NOT use for simple approve/reject (that is handled by tool approval).',
    needsApproval: true,
    inputSchema: z.object({
        question: z.string().describe('The question to ask the user.'),
        options: z.array(z.string()).min(2).max(4).describe('2-4 option texts for the user to choose from.'),
        header: z.string().optional().describe('A short label for UI display.')
    }),
    execute: async ({ question, options, header }) => {
        // Actual selection is handled by the TUI approval dialog
        // This execute is called after the user makes their choice
        // Return structure lets the model know this is awaiting user selection
        return {
            question,
            options,
            header: header ?? 'Select',
            status: 'awaiting_user_selection'
        };
    }
});
