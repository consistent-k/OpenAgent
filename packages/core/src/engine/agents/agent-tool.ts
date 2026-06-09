import { agentRegistry, type AgentDefinition, type AgentResult, type AgentEventEmitter } from '@oagent/agents';
import { t } from '@oagent/i18n';
import { tool, streamText, stepCountIs, type ModelMessage } from 'ai';
import { z } from 'zod';
import { getProvider, getOrCreateProviderByConfig } from '../config/provider';
import { tools as allTools } from '../tools';
import { updateAgentActivity, type AgentStep } from './agent-activity-store';
import { registerBackgroundTask, updateBackgroundTask } from './background-task-store';
import { getProvider as getProviderConfig, getMaxSteps, getModelName } from '@/config';
import { truncate } from '@/utils/truncate';
import { uid } from '@/utils/uid';

// ── 全局取消控制器 ──
// ESC 时调用 abortAll()，所有正在执行的工具（包括子代理）都会收到 abort 信号
let globalAbortController = new AbortController();

/** 获取当前全局 abort signal（与传入的 signal 合并使用） */
function getGlobalAbortSignal(): AbortSignal {
    return globalAbortController.signal;
}

/** 终止所有正在执行的工具和子代理 */
export function abortAll(): void {
    globalAbortController.abort();
    globalAbortController = new AbortController();
}

/** 合并多个 abort signal 为一个（任一触发即终止） */
function mergeSignals(...signals: (AbortSignal | undefined)[]): AbortSignal {
    const valid = signals.filter(Boolean) as AbortSignal[];
    if (valid.length === 0) return new AbortController().signal;
    if (valid.length === 1) return valid[0]!;
    return AbortSignal.any(valid);
}

/** Global event emitter for sub-agent activity (set by TUI layer) */
let globalEmitter: AgentEventEmitter | null = null;

export function setAgentEventEmitter(emitter: AgentEventEmitter | null): void {
    globalEmitter = emitter;
}

export function getAgentEventEmitter(): AgentEventEmitter | null {
    return globalEmitter;
}

/**
 * Resolve which tools an agent is allowed to use.
 * If disallowedTools is set, it takes precedence (denylist mode).
 * If allowedTools is set, only those tools are included (allowlist mode).
 * If neither is set, returns all tools.
 */
export function resolveAgentTools(agentDef: AgentDefinition) {
    // Denylist mode: disallowedTools takes precedence
    if (agentDef.disallowedTools && agentDef.disallowedTools.length > 0) {
        const filtered: Record<string, (typeof allTools)[keyof typeof allTools]> = {};
        for (const [name, tool] of Object.entries(allTools)) {
            if (!agentDef.disallowedTools.includes(name)) {
                filtered[name] = tool;
            }
        }
        return filtered;
    }

    // Allowlist mode
    if (!agentDef.allowedTools || agentDef.allowedTools.length === 0) {
        return allTools;
    }

    const filtered: Record<string, (typeof allTools)[keyof typeof allTools]> = {};
    for (const toolName of agentDef.allowedTools) {
        if (toolName in allTools) {
            filtered[toolName] = allTools[toolName as keyof typeof allTools]!;
        }
    }
    return filtered;
}

/**
 * Resolve the model for an agent. Uses agent-specific model override
 * if specified, otherwise falls back to the global active model.
 */
export function resolveAgentModel(agentDef: AgentDefinition, maxRetries: number) {
    if (agentDef.model) {
        const slashIndex = agentDef.model.indexOf('/');
        if (slashIndex > 0) {
            const providerName = agentDef.model.slice(0, slashIndex);
            const modelName = agentDef.model.slice(slashIndex + 1);
            const providerConfig = getProviderConfig(providerName);
            if (providerConfig) {
                const provider = getOrCreateProviderByConfig({
                    name: providerConfig.name,
                    apiKey: providerConfig.apiKey,
                    baseUrl: providerConfig.baseUrl
                });
                return provider.languageModel(modelName);
            }
        }
    }

    // Fallback: use global active model
    return getProvider(maxRetries)(getModelName());
}

/** Structured result from a sub-agent run (typed, no JSON parsing needed) */
export interface AgentRunResult {
    agent: string;
    completed: boolean;
    steps: number;
    usage: string;
    activity: string;
    result: string;
}

/** Messages yielded by the async generator during agent execution */
export type AgentRunMessage =
    | { type: 'text-delta'; agentId: string; runId: string; text: string }
    | { type: 'tool-call'; agentId: string; runId: string; toolName: string; input: unknown }
    | { type: 'tool-result'; agentId: string; runId: string; toolName: string; output: unknown }
    | { type: 'complete'; result: AgentRunResult }
    | { type: 'error'; error: string };

/**
 * Async generator that executes a sub-agent and yields messages as they arrive.
 * This is the canonical execution path; executeAgentRun() wraps it for callers
 * that just need the final result.
 */
export async function* executeAgentRunGenerator(
    agentDef: AgentDefinition,
    taskMessage: string,
    abortSignal?: AbortSignal,
    toolCallId?: string,
    emitter?: AgentEventEmitter | null
): AsyncGenerator<AgentRunMessage> {
    const runId = uid();
    const effectiveEmitter = emitter ?? globalEmitter;
    effectiveEmitter?.onAgentStart(agentDef.id, runId);

    try {
        const agentTools = resolveAgentTools(agentDef);
        const maxRetries = agentDef.maxRetries ?? 10;
        const model = resolveAgentModel(agentDef, maxRetries);
        const maxSteps = agentDef.maxSteps ?? getMaxSteps();

        const messages: ModelMessage[] = [{ role: 'user', content: taskMessage }];

        // 合并外部 abortSignal、全局 abortSignal（ESC 硬终止）和 per-run controller
        const runController = new AbortController();
        const mergedSignal = mergeSignals(abortSignal, getGlobalAbortSignal(), runController.signal);

        const result = streamText({
            model,
            stopWhen: stepCountIs(maxSteps),
            system: agentDef.systemPrompt,
            messages,
            tools: agentTools as Parameters<typeof streamText>[0]['tools'],
            abortSignal: mergedSignal,
            maxRetries
        });

        let fullText = '';
        const steps: AgentStep[] = [];

        for await (const event of result.fullStream) {
            switch (event.type) {
                case 'text-delta':
                    fullText += event.text;
                    effectiveEmitter?.onAgentText(agentDef.id, runId, event.text);
                    if (toolCallId) {
                        updateAgentActivity(toolCallId, (prev) => ({ ...prev, text: prev.text + event.text }));
                    }
                    yield { type: 'text-delta', agentId: agentDef.id, runId, text: event.text };
                    break;

                case 'tool-call': {
                    const inputStr = typeof event.input === 'string' ? event.input : JSON.stringify(event.input);
                    const step = { toolName: event.toolName, input: truncate(inputStr, 200) };
                    steps.push(step);
                    effectiveEmitter?.onAgentToolCall(agentDef.id, runId, event.toolName, event.input);
                    if (toolCallId) {
                        updateAgentActivity(toolCallId, (prev) => ({ ...prev, steps: [...prev.steps, step] }));
                    }
                    yield { type: 'tool-call', agentId: agentDef.id, runId, toolName: event.toolName, input: event.input };
                    break;
                }

                case 'tool-result': {
                    const outputStr = typeof event.output === 'string' ? event.output : JSON.stringify(event.output);
                    const truncated = truncate(outputStr, 300);
                    for (let i = steps.length - 1; i >= 0; i--) {
                        if (steps[i]!.output === undefined) {
                            steps[i]!.output = truncated;
                            break;
                        }
                    }
                    effectiveEmitter?.onAgentToolResult(agentDef.id, runId, event.toolName ?? '', event.output);
                    if (toolCallId) {
                        updateAgentActivity(toolCallId, (prev) => {
                            const newSteps = [...prev.steps];
                            for (let i = newSteps.length - 1; i >= 0; i--) {
                                if (newSteps[i]!.output === undefined) {
                                    newSteps[i] = { ...newSteps[i]!, output: truncated };
                                    break;
                                }
                            }
                            return { ...prev, steps: newSteps };
                        });
                    }
                    yield { type: 'tool-result', agentId: agentDef.id, runId, toolName: event.toolName ?? '', output: event.output };
                    break;
                }
            }
        }

        const usage = await result.totalUsage;
        const finishReason = await result.finishReason;

        const agentResult: AgentResult = {
            agentId: agentDef.id,
            text: fullText,
            completed: finishReason === 'stop' || finishReason === 'other',
            usage: usage
                ? {
                      inputTokens: usage.inputTokens ?? 0,
                      outputTokens: usage.outputTokens ?? 0,
                      totalTokens: usage.totalTokens ?? 0
                  }
                : undefined,
            stepsUsed: steps.length
        };

        effectiveEmitter?.onAgentEnd(agentDef.id, runId, agentResult);

        const activityLog = formatActivityLog(steps);
        const usageStr = agentResult.usage ? ` (${agentResult.usage.inputTokens}in/${agentResult.usage.outputTokens}out)` : '';

        yield {
            type: 'complete',
            result: {
                agent: agentDef.name,
                completed: agentResult.completed,
                steps: agentResult.stepsUsed,
                usage: usageStr,
                activity: activityLog,
                result: agentResult.text
            }
        };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        effectiveEmitter?.onAgentError(agentDef.id, runId, errorMsg);
        if (error instanceof Error && error.name === 'AbortError') {
            yield {
                type: 'complete',
                result: {
                    agent: agentDef.name,
                    completed: false,
                    steps: 0,
                    usage: '',
                    activity: '',
                    result: `⚠️ ${t('error.streamInterrupted')}`
                }
            };
        } else {
            yield { type: 'error', error: errorMsg };
        }
    }
}

/** Run a sub-agent to completion and return structured result (wraps the generator) */
export async function executeAgentRun(agentDef: AgentDefinition, taskMessage: string, abortSignal?: AbortSignal, toolCallId?: string, emitter?: AgentEventEmitter | null): Promise<AgentRunResult> {
    let finalResult: AgentRunResult | null = null;
    for await (const msg of executeAgentRunGenerator(agentDef, taskMessage, abortSignal, toolCallId, emitter)) {
        if (msg.type === 'complete') finalResult = msg.result;
        if (msg.type === 'error') throw new Error(msg.error);
    }
    return finalResult!;
}

/** Stringify AgentRunResult for use as AI tool output */
export function stringifyAgentResult(result: AgentRunResult): string {
    return JSON.stringify(result);
}

function formatActivityLog(steps: AgentStep[]): string {
    if (steps.length === 0) return '';

    const lines: string[] = [];
    for (const step of steps) {
        const inputPreview = step.input ? step.input : '';
        lines.push(`→ ${step.toolName}(${inputPreview})`);
        if (step.output) {
            lines.push(`  ← ${step.output}`);
        }
    }
    return lines.join('\n');
}

/** Cached unified agent tool — invalidated on reload */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedUnifiedTool: any = null;

/** Invalidate cached agent tools (called on /reload) */
export function invalidateAgentToolCache(): void {
    cachedUnifiedTool = null;
}

/**
 * Resolve the default agent when subagent_type is not specified.
 * Prefers 'planner', then first registered agent.
 */
function getDefaultAgent(): AgentDefinition | undefined {
    return agentRegistry.get('planner') ?? agentRegistry.getAll()[0];
}

/**
 * Create a unified Agent tool — single tool with subagent_type parameter.
 * Replaces the per-agent tools (agent_{id}), parallel tool, and handoff tool.
 * Cached and invalidated on reload.
 */
export function createUnifiedAgentTool() {
    if (cachedUnifiedTool) return cachedUnifiedTool;

    const agentSummaries = agentRegistry
        .getAll()
        .map((a) => `- ${a.id}: ${a.description}`)
        .join('\n');

    const unifiedTool = tool({
        description:
            'Launch a specialized sub-agent to perform a task. ' +
            'Each sub-agent has its own system prompt, tools, and model. ' +
            'Use subagent_type to select a specific agent, or omit it to use the default.\n\n' +
            'Available agents:\n' +
            agentSummaries,
        inputSchema: z.object({
            prompt: z.string().describe('The task for the agent to perform. Be specific and provide all necessary context.'),
            subagent_type: z
                .string()
                .optional()
                .describe(
                    'The type of specialized agent to use. Available: ' +
                        agentRegistry
                            .getAll()
                            .map((a) => a.id)
                            .join(', ') +
                        '. If omitted, uses the default agent.'
                ),
            model: z.string().optional().describe("Optional model override in 'Provider/Model' format. If omitted, uses the agent definition's model or the global active model."),
            description: z.string().optional().describe('A short (3-5 word) description of the task for display.'),
            run_in_background: z.boolean().optional().describe('Set to true to run this agent in the background. You will be notified when it completes.')
        }),
        execute: async ({ prompt, subagent_type, model: modelOverride, description: _description, run_in_background }, { abortSignal, toolCallId }) => {
            // Resolve agent definition
            let agentDef: AgentDefinition | undefined;
            if (subagent_type) {
                agentDef = agentRegistry.get(subagent_type);
                if (!agentDef) {
                    throw new Error(
                        `Unknown agent: ${subagent_type}. Available: ${agentRegistry
                            .getAll()
                            .map((a) => a.id)
                            .join(', ')}`
                    );
                }
            } else {
                agentDef = getDefaultAgent();
                if (!agentDef) {
                    throw new Error('No agents registered. Use /reload to reload agents.');
                }
            }

            // Apply model override if specified
            if (modelOverride) {
                agentDef = { ...agentDef, model: modelOverride };
            }

            // Background execution
            if (run_in_background) {
                const taskId = uid();
                registerBackgroundTask({
                    id: taskId,
                    agentId: agentDef.id,
                    description: _description ?? prompt.slice(0, 60),
                    status: 'running',
                    startedAt: Date.now()
                });

                // Fire and forget — the task runs in the background
                void (async () => {
                    try {
                        const result = await executeAgentRun(agentDef!, prompt, abortSignal, toolCallId);
                        updateBackgroundTask(taskId, {
                            status: 'completed',
                            result: result.result,
                            completedAt: Date.now()
                        });
                    } catch (error) {
                        updateBackgroundTask(taskId, {
                            status: 'failed',
                            error: error instanceof Error ? error.message : String(error),
                            completedAt: Date.now()
                        });
                    }
                })();

                return JSON.stringify({
                    agent: agentDef.name,
                    background: true,
                    taskId,
                    message: `Background task ${taskId} started for agent '${agentDef.id}'.`
                });
            }

            // Synchronous execution
            const result = await executeAgentRun(agentDef, prompt, abortSignal, toolCallId);
            return stringifyAgentResult(result);
        }
    });

    cachedUnifiedTool = unifiedTool;
    return unifiedTool;
}
