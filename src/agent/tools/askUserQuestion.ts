import { tool } from 'ai';
import { z } from 'zod';

export const askUserQuestionTool = tool({
    description: '向用户提出选择性问题，提供 2-4 个选项供用户选择。用于需要用户决策的场景，如确认操作方向、选择实现方案、偏好设置等。不要用于简单的批准/拒绝（那是工具审批的职责）。',
    needsApproval: true,
    inputSchema: z.object({
        question: z.string().describe('要向用户提出的问题'),
        options: z.array(z.string()).min(2).max(4).describe('2-4 个选项文本，供用户选择'),
        header: z.string().optional().describe('简短的标签，用于 UI 显示')
    }),
    execute: async ({ question, options, header }) => {
        // 实际选择由 TUI 的 approval dialog 处理
        // 这里的 execute 在用户选择后被调用
        // 返回结构让模型知道这是等待用户选择的状态
        return {
            question,
            options,
            header: header ?? '选择',
            status: 'awaiting_user_selection'
        };
    }
});
