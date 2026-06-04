import { t } from '@oagent/i18n';
import { APPROVABLE_TOOLS, clearAllApprovals, getApprovalSummary, setToolApproval } from '../engine/tools/utils/approval-store';
import { uid } from '../utils/uid';
import type { SlashCommand } from './registry';

function getToolLabels(): Record<string, string> {
    return {
        execute_bash: t('command.approvals.label.executeBash'),
        write_file: t('command.approvals.label.writeFile'),
        edit_file: t('command.approvals.label.editFile')
    };
}

export const approvalsCommand: SlashCommand = {
    name: '/approvals',
    getDescription: () => t('command.approvals.description'),
    run: ({ rawInput, args, appendMessages }) => {
        // /approvals clear — 清除所有偏好
        if (args[0] === 'clear') {
            clearAllApprovals();
            appendMessages([
                { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
                { id: uid(), role: 'assistant', parts: [{ type: 'text', text: t('command.approvals.allCleared'), state: 'done' }] }
            ]);
            return;
        }

        // /approvals revoke <tool> — 取消某工具的自动批准
        if (args[0] === 'revoke' && args[1]) {
            const toolName = args[1];
            if (!APPROVABLE_TOOLS.includes(toolName as (typeof APPROVABLE_TOOLS)[number])) {
                appendMessages([
                    { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
                    { id: uid(), role: 'assistant', parts: [{ type: 'text', text: t('command.approvals.unknownTool', { toolName, tools: APPROVABLE_TOOLS.join(', ') }), state: 'done' }] }
                ]);
                return;
            }
            setToolApproval(toolName, false);
            appendMessages([
                { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
                { id: uid(), role: 'assistant', parts: [{ type: 'text', text: t('command.approvals.revoked', { toolName }), state: 'done' }] }
            ]);
            return;
        }

        // /approvals — 显示当前偏好
        const summary = getApprovalSummary();
        const toolLabels = getToolLabels();
        const lines = APPROVABLE_TOOLS.map((tool) => {
            const label = toolLabels[tool] ?? tool;
            const status = summary[tool] ? t('command.approvals.status.alwaysApproved') : t('command.approvals.status.needsConfirm');
            return `- **${label}** (${tool})：${status}`;
        });

        const text = [t('command.approvals.header'), ...lines, '', t('command.approvals.helpClear'), t('command.approvals.helpRevoke')].join('\n');

        appendMessages([
            { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
            { id: uid(), role: 'assistant', parts: [{ type: 'text', text, state: 'done' }] }
        ]);
    }
};
