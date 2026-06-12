import { t } from '@oagent/i18n';
import type { StringThemeKeys } from '../ui/text/theme';

export interface ToolStateMeta {
    icon: string;
    color: StringThemeKeys;
    label: string;
}

export type ToolStateKey = 'input-streaming' | 'input-available' | 'approval-requested' | 'approval-responded' | 'output-available' | 'output-error' | 'output-denied';

const INACTIVE_META: ToolStateMeta = { icon: '○', color: 'inactive' as StringThemeKeys, label: '' };

/** Variant-independent state metadata (hoisted to avoid per-call allocation) */
const STATIC_STATE_META: Partial<Record<ToolStateKey, Omit<ToolStateMeta, 'label'>>> = {
    'input-streaming': { icon: '···', color: 'accent' },
    'input-available': { icon: '○', color: 'accent' },
    'approval-requested': { icon: '◔', color: 'warning' },
    'approval-responded': { icon: '◉', color: 'success' },
    'output-available': { icon: '●', color: 'success' },
    'output-error': { icon: '▲', color: 'error' },
    'output-denied': { icon: '▲', color: 'error' }
};

/** 通用工具状态元数据（Agent 和 Tool 共享） */
export function getToolStateMeta(state: string, variant: 'agent' | 'tool' = 'tool'): ToolStateMeta {
    const base = STATIC_STATE_META[state as ToolStateKey];
    if (!base) return INACTIVE_META;

    // Only the label depends on variant
    let label = '';
    switch (state) {
        case 'input-streaming':
            label = variant === 'agent' ? t('tool.agent.preparing') : t('tool.state.waitingInput');
            break;
        case 'input-available':
            label = variant === 'agent' ? t('tool.agent.pending') : t('tool.state.pending');
            break;
        case 'approval-requested':
            label = t('tool.state.awaitingApproval');
            break;
        case 'approval-responded':
            label = variant === 'agent' ? t('tool.agent.running') : t('tool.state.executing');
            break;
        case 'output-available':
            label = variant === 'agent' ? t('tool.agent.completed') : t('tool.state.completed');
            break;
        case 'output-error':
            label = t('tool.state.error');
            break;
        case 'output-denied':
            label = t('tool.state.denied');
            break;
    }
    return { ...base, label };
}
