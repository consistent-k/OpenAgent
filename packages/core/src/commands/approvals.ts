import { APPROVABLE_TOOLS, clearAllApprovals, getApprovalSummary, setToolApproval } from '../engine/tools/utils/approval-store';
import { uid } from '../utils/uid';
import type { SlashCommand } from './registry';

const TOOL_LABELS: Record<string, string> = {
    execute_bash: 'Bash 命令执行',
    write_file: '文件写入',
    edit_file: '文件编辑'
};

export const approvalsCommand: SlashCommand = {
    name: '/approvals',
    description: '管理工具审批偏好（始终批准 / 撤销）',
    run: ({ rawInput, args, appendMessages }) => {
        // /approvals clear — 清除所有偏好
        if (args[0] === 'clear') {
            clearAllApprovals();
            appendMessages([
                { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
                { id: uid(), role: 'assistant', parts: [{ type: 'text', text: '已清除所有审批偏好，后续工具调用将恢复为默认审批行为。', state: 'done' }] }
            ]);
            return;
        }

        // /approvals revoke <tool> — 取消某工具的自动批准
        if (args[0] === 'revoke' && args[1]) {
            const toolName = args[1];
            if (!APPROVABLE_TOOLS.includes(toolName as (typeof APPROVABLE_TOOLS)[number])) {
                appendMessages([
                    { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
                    { id: uid(), role: 'assistant', parts: [{ type: 'text', text: `未知工具：${toolName}。可配置的工具：${APPROVABLE_TOOLS.join(', ')}`, state: 'done' }] }
                ]);
                return;
            }
            setToolApproval(toolName, false);
            appendMessages([
                { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
                { id: uid(), role: 'assistant', parts: [{ type: 'text', text: `已取消 ${toolName} 的自动批准，后续将恢复审批确认。`, state: 'done' }] }
            ]);
            return;
        }

        // /approvals — 显示当前偏好
        const summary = getApprovalSummary();
        const lines = APPROVABLE_TOOLS.map((tool) => {
            const label = TOOL_LABELS[tool] ?? tool;
            const status = summary[tool] ? '✅ 始终批准' : '⬜ 需要确认';
            return `- **${label}** (${tool})：${status}`;
        });

        const text = ['**审批偏好：**', ...lines, '', '命令：', '- `/approvals clear` — 清除所有偏好', '- `/approvals revoke <tool>` — 取消某工具的自动批准'].join('\n');

        appendMessages([
            { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
            { id: uid(), role: 'assistant', parts: [{ type: 'text', text, state: 'done' }] }
        ]);
    }
};
