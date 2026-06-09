import { agentRegistry } from '@oagent/agents';
import { t } from '@oagent/i18n';
import type { DynamicToolUIPart, ToolUIPart } from 'ai';
import { Box } from 'ink';
import React, { useEffect } from 'react';
import { clearAgentActivity } from '../../engine/agents/agent-activity-store';
import { useAgentActivity, useAgentRunning } from '../../hooks/useAgentActivity';
import { getToolStateMeta } from '../../hooks/useToolStateMeta';
import { isTerminalToolState } from '../../utils/tool-state';
import { ThemedText } from '../text/ThemedText';

type AnyToolPart = DynamicToolUIPart | ToolUIPart;

interface AgentCallPartProps {
    part: AnyToolPart;
}

/** Unified agent tool name — must match the tool name in agent-tool.ts */
export const AGENT_TOOL_NAME = 'agent';

function isAgentTool(toolName: string): boolean {
    return toolName === AGENT_TOOL_NAME;
}

function getAgentDisplayName(input: Record<string, unknown> | undefined): string {
    const subagentType = input?.subagent_type as string | undefined;
    if (subagentType) {
        const agentDef = agentRegistry.get(subagentType);
        return agentDef?.name ?? subagentType;
    }
    return t('tool.agent.default');
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
    const input = part.input as Record<string, unknown> | undefined;
    const agentName = getAgentDisplayName(input);

    const meta = getToolStateMeta(part.state, 'agent');

    const taskPreview = typeof input?.prompt === 'string' ? (input.prompt.length > 60 ? input.prompt.slice(0, 60) + '…' : input.prompt) : '';

    const isTerminal = isTerminalToolState(part.state);

    // 通过 activity store 检测子代理是否正在运行
    // 不依赖 part.state（useChat 可能在同一微任务中处理 tool-call 和 tool-result，
    // 导致 part 跳过 input-available 直接到 output-available）
    const isRunning = useAgentRunning(part.toolCallId, isTerminal);

    // 终态时清理 store 中的活动数据，避免内存泄漏
    useEffect(() => {
        if (isTerminal && !isRunning) {
            clearAgentActivity(part.toolCallId);
        }
    }, [isTerminal, isRunning, part.toolCallId]);

    // 实时活动数据（子代理执行期间）
    const liveActivity = useAgentActivity(part.toolCallId);
    const hasLiveActivity = isRunning && liveActivity && (liveActivity.text.length > 0 || liveActivity.steps.length > 0);

    // Parse structured output (终态)
    const parsed = isTerminal && part.state === 'output-available' && !isRunning ? parseAgentOutput(part.output) : null;
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
                    <ThemedText color={isRunning ? 'accent' : meta.color}>{isRunning ? '⟳' : meta.icon}</ThemedText>
                    {isRunning && <ThemedText color="accent"> {t('tool.agent.running')} </ThemedText>}
                    {!isRunning && meta.label && <ThemedText color={meta.color}> {meta.label} </ThemedText>}
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
                                <ThemedText color="accent" bold>
                                    {agentName}
                                </ThemedText>{' '}
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

            {/* 运行中但尚无活动数据时的提示 */}
            {isRunning && !hasLiveActivity && (
                <Box paddingLeft={3} marginTop={0}>
                    <ThemedText color="textDim">{t('tool.agent.preparing')}</ThemedText>
                </Box>
            )}

            {/* Activity log: tool calls made by the sub-agent (终态) */}
            {!isRunning && isTerminal && activityLines.length > 0 && (
                <Box flexDirection="column" paddingLeft={3} marginTop={0}>
                    {activityLines.map((line, i) => (
                        <ThemedText key={i} color={line.startsWith('→') ? 'accent' : 'textDim'}>
                            {line}
                        </ThemedText>
                    ))}
                </Box>
            )}

            {/* Result preview */}
            {!isRunning && isTerminal && resultPreview && (
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
