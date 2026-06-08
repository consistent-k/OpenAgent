import { t } from '@oagent/i18n';
import type { DynamicToolUIPart, ToolUIPart } from 'ai';
import { getToolName } from 'ai';
import { Box } from 'ink';
import React, { useEffect } from 'react';
import { clearAgentActivity } from '../../engine/agents/agent-activity-store';
import { useAgentActivity } from '../../hooks/useAgentActivity';
import { type StringThemeKeys } from '../text/theme';
import { ThemedText } from '../text/ThemedText';

type AnyToolPart = DynamicToolUIPart | ToolUIPart;

interface AgentCallPartProps {
    part: AnyToolPart;
}

/** Agent tool name prefix — must match the naming in agent-tool.ts */
export const AGENT_TOOL_PREFIX = 'agent_';

function isAgentTool(toolName: string): boolean {
    return toolName.startsWith(AGENT_TOOL_PREFIX) || toolName === 'run_agents_parallel' || toolName === 'agent_handoff';
}

function getAgentDisplayName(toolName: string): string {
    if (toolName === 'run_agents_parallel') return t('tool.agent.parallel');
    if (toolName === 'agent_handoff') return t('tool.agent.handoff');
    return toolName.replace(AGENT_TOOL_PREFIX, '');
}

/** Locale-dependent state metadata — recomputed when t() values change */
function getAgentStates(): Record<string, { icon: string; color: StringThemeKeys; label: string }> {
    return {
        'input-streaming': { icon: '···', color: 'accent', label: t('tool.agent.preparing') },
        'input-available': { icon: '○', color: 'accent', label: t('tool.agent.pending') },
        'approval-requested': { icon: '◔', color: 'warning', label: t('tool.state.awaitingApproval') },
        'approval-responded': { icon: '◉', color: 'success', label: t('tool.agent.running') },
        'output-available': { icon: '●', color: 'success', label: '' },
        'output-error': { icon: '▲', color: 'error', label: t('tool.state.error') },
        'output-denied': { icon: '▲', color: 'error', label: t('tool.state.denied') }
    };
}

/** Parse the JSON output from executeAgentRun */
function parseAgentOutput(output: unknown): { activity?: string; result?: string; steps?: number; usage?: string } | null {
    if (typeof output !== 'string') return null;
    try {
        return JSON.parse(output);
    } catch {
        return null;
    }
}

export const AgentCallPart = React.memo(function AgentCallPart({ part }: AgentCallPartProps) {
    const toolName = getToolName(part);
    const agentName = getAgentDisplayName(toolName);
    const input = part.input as Record<string, unknown> | undefined;

    const agentStates = getAgentStates();
    const meta = agentStates[part.state] ?? { icon: '○', color: 'inactive' as StringThemeKeys, label: '' };

    const taskPreview = typeof input?.task === 'string' ? (input.task.length > 60 ? input.task.slice(0, 60) + '…' : input.task) : '';

    const isTerminal = part.state === 'output-available' || part.state === 'output-error' || part.state === 'output-denied';

    // 终态时清理 store 中的活动数据，避免内存泄漏
    useEffect(() => {
        if (isTerminal) {
            clearAgentActivity(part.toolCallId);
        }
    }, [isTerminal, part.toolCallId]);

    // 实时活动数据（子代理执行期间）
    const liveActivity = useAgentActivity(part.toolCallId);
    const hasLiveActivity = !isTerminal && liveActivity && (liveActivity.text.length > 0 || liveActivity.steps.length > 0);

    // Parse structured output (终态)
    const parsed = isTerminal && part.state === 'output-available' ? parseAgentOutput(part.output) : null;
    const activityLines = parsed?.activity ? parsed.activity.split('\n').filter(Boolean) : [];
    const resultText = parsed?.result ?? '';
    const resultPreview = resultText.length > 120 ? resultText.slice(0, 120) + '…' : resultText;

    // Error output
    const errorText = isTerminal && part.state === 'output-error' ? (part.errorText?.slice(0, 120) ?? '') : '';

    // 实时文本预览
    const liveText = liveActivity?.text ?? '';
    const liveTextPreview = liveText.length > 200 ? '…' + liveText.slice(-200) : liveText;

    return (
        <Box flexDirection="column" marginBottom={1} paddingLeft={1}>
            {/* Header line: status icon + agent name + task */}
            <Box flexDirection="row">
                <ThemedText>
                    <ThemedText color={meta.color}>{meta.icon}</ThemedText>
                    {meta.label && <ThemedText color={meta.color}> {meta.label} </ThemedText>}
                    <ThemedText color="accent">[{agentName}]</ThemedText>
                    {taskPreview && <ThemedText color="textDim"> {taskPreview}</ThemedText>}
                    {parsed?.steps !== undefined && (
                        <ThemedText color="textDim">
                            {' '}
                            ({parsed.steps} steps{parsed.usage ?? ''})
                        </ThemedText>
                    )}
                </ThemedText>
            </Box>

            {/* 实时活动：子代理执行期间 */}
            {hasLiveActivity && (
                <Box flexDirection="column" paddingLeft={3} marginTop={0}>
                    {/* 实时工具调用 */}
                    {liveActivity!.steps.map((step, i) => (
                        <Box key={i} flexDirection="column">
                            <ThemedText color="accent">
                                {'→ '}
                                {step.toolName}
                                {step.input ? `(${step.input.length > 80 ? step.input.slice(0, 80) + '…' : step.input})` : ''}
                            </ThemedText>
                            {step.output && (
                                <ThemedText color="textDim">
                                    {'  ← '}
                                    {step.output.length > 120 ? step.output.slice(0, 120) + '…' : step.output}
                                </ThemedText>
                            )}
                        </Box>
                    ))}
                    {/* 实时文本输出 */}
                    {liveTextPreview && <ThemedText color="textDim">{liveTextPreview}</ThemedText>}
                </Box>
            )}

            {/* Activity log: tool calls made by the sub-agent (终态) */}
            {isTerminal && activityLines.length > 0 && (
                <Box flexDirection="column" paddingLeft={3} marginTop={0}>
                    {activityLines.map((line, i) => (
                        <ThemedText key={i} color={line.startsWith('→') ? 'accent' : 'textDim'}>
                            {line}
                        </ThemedText>
                    ))}
                </Box>
            )}

            {/* Result preview */}
            {isTerminal && resultPreview && (
                <Box paddingLeft={3} marginTop={0}>
                    <ThemedText color={meta.color}>{resultPreview}</ThemedText>
                </Box>
            )}

            {/* Error */}
            {isTerminal && errorText && (
                <Box paddingLeft={3} marginTop={0}>
                    <ThemedText color="error">{errorText}</ThemedText>
                </Box>
            )}
        </Box>
    );
});

export { isAgentTool };
