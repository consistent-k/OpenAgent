import { agentRegistry, type AgentDefinition, type AgentResult, type AgentEventEmitter } from '@oagent/agents';
import { tool, streamText, stepCountIs, type ModelMessage } from 'ai';
import { z } from 'zod';
import { getProvider, getOrCreateProviderByConfig } from '../config/provider';
import { tools as allTools } from '../tools';
import { getProvider as getProviderConfig, getMaxSteps, getModelName } from '@/config';
import { uid } from '@/utils/uid';

/** Global event emitter for sub-agent activity (set by TUI layer) */
let globalEmitter: AgentEventEmitter | null = null;

export function setAgentEventEmitter(emitter: AgentEventEmitter | null): void {
    globalEmitter = emitter;
}

export function getAgentEventEmitter(): AgentEventEmitter | null {
    return globalEmitter;
}

/** A single tool-call step in the sub-agent's execution */
interface AgentStep {
    toolName: string;
    input: string;
    output?: string;
}

/**
 * Resolve which tools an agent is allowed to use.
 * If allowedTools is undefined, returns all tools without copying.
 */
export function resolveAgentTools(agentDef: AgentDefinition) {
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

/** Helper to run a sub-agent to completion and return structured result */
async function executeAgentRun(agentDef: AgentDefinition, taskMessage: string, abortSignal?: AbortSignal): Promise<string> {
    const runId = uid();
    const emitter = globalEmitter;
    emitter?.onAgentStart(agentDef.id, runId);

    try {
        const agentTools = resolveAgentTools(agentDef);
        const maxRetries = agentDef.maxRetries ?? 10;
        const model = resolveAgentModel(agentDef, maxRetries);
        const maxSteps = agentDef.maxSteps ?? getMaxSteps();

        const messages: ModelMessage[] = [{ role: 'user', content: taskMessage }];

        const result = streamText({
            model,
            stopWhen: stepCountIs(maxSteps),
            system: agentDef.systemPrompt,
            messages,
            tools: agentTools as Parameters<typeof streamText>[0]['tools'],
            abortSignal,
            maxRetries
        });

        // Collect full stream: text + tool calls + tool results
        let fullText = '';
        const steps: AgentStep[] = [];

        for await (const event of result.fullStream) {
            switch (event.type) {
                case 'text-delta':
                    fullText += event.text;
                    emitter?.onAgentText(agentDef.id, runId, event.text);
                    break;

                case 'tool-call': {
                    const inputStr = typeof event.input === 'string' ? event.input : JSON.stringify(event.input);
                    steps.push({
                        toolName: event.toolName,
                        input: truncate(inputStr, 200)
                    });
                    emitter?.onAgentToolCall(agentDef.id, runId, event.toolName, event.input);
                    break;
                }

                case 'tool-result': {
                    const outputStr = typeof event.output === 'string' ? event.output : JSON.stringify(event.output);
                    // Find the matching tool-call step and fill in its output
                    for (let i = steps.length - 1; i >= 0; i--) {
                        if (steps[i]!.output === undefined) {
                            steps[i]!.output = truncate(outputStr, 300);
                            break;
                        }
                    }
                    emitter?.onAgentToolResult(agentDef.id, runId, event.toolName ?? '', event.output);
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

        emitter?.onAgentEnd(agentDef.id, runId, agentResult);

        // Build human-readable output with activity log
        const activityLog = formatActivityLog(steps);
        const usageStr = agentResult.usage ? ` (${agentResult.usage.inputTokens}in/${agentResult.usage.outputTokens}out)` : '';

        return JSON.stringify({
            agent: agentDef.name,
            completed: agentResult.completed,
            steps: agentResult.stepsUsed,
            usage: usageStr,
            activity: activityLog,
            result: agentResult.text
        });
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        emitter?.onAgentError(agentDef.id, runId, errorMsg);
        throw error;
    }
}

function truncate(str: string, maxLen: number): string {
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen) + '…';
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

/** Cached agent tools — invalidated on reload */
let cachedAgentTools: Record<string, ReturnType<typeof createAgentTool>> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedParallelTool: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedHandoffTool: any = null;

/** Invalidate cached agent tools (called on /reload) */
export function invalidateAgentToolCache(): void {
    cachedAgentTools = null;
    cachedParallelTool = null;
    cachedHandoffTool = null;
}

/**
 * Create a tool that wraps a single sub-agent.
 */
export function createAgentTool(agentDef: AgentDefinition) {
    return tool({
        description: agentDef.description,
        inputSchema: z.object({
            task: z.string().describe('The task or question to delegate to this agent. Be specific and provide all necessary context.'),
            context: z.string().optional().describe('Additional context, file paths, or relevant information for the agent.')
        }),
        execute: async ({ task, context }, { abortSignal }) => {
            const taskMessage = context ? `Task: ${task}\n\nAdditional Context:\n${context}` : `Task: ${task}`;
            return executeAgentRun(agentDef, taskMessage, abortSignal);
        }
    });
}

/**
 * Create tools for ALL registered agents.
 * Each agent becomes a tool named `agent_{id}` — prefix must match AGENT_TOOL_PREFIX in AgentCallPart.tsx.
 * Results are cached and invalidated on reload.
 */
export function createAgentTools() {
    if (cachedAgentTools) return cachedAgentTools;
    const agentTools: Record<string, ReturnType<typeof createAgentTool>> = {};
    for (const agentDef of agentRegistry.getAll()) {
        agentTools[`agent_${agentDef.id}`] = createAgentTool(agentDef);
    }
    cachedAgentTools = agentTools;
    return agentTools;
}

/**
 * Tool that runs multiple sub-agents in parallel and collects results.
 * Cached and invalidated on reload.
 */
export function createParallelAgentTool() {
    if (cachedParallelTool) return cachedParallelTool;
    const parallelTool = tool({
        description:
            'Run multiple specialized agents in parallel to work on different subtasks simultaneously. ' +
            'Use this when a task can be decomposed into independent parts that do not depend on each other. ' +
            'Each agent gets its own task and runs concurrently. Results are collected and returned together.\n\n' +
            'Available agents:\n' +
            agentRegistry
                .getAll()
                .map((a) => `- ${a.id}: ${a.description}`)
                .join('\n'),
        inputSchema: z.object({
            tasks: z
                .array(
                    z.object({
                        agentId: z.string().describe('The ID of the agent to use'),
                        task: z.string().describe('The specific task for this agent'),
                        context: z.string().optional().describe('Additional context for this agent')
                    })
                )
                .min(1)
                .max(5)
                .describe('List of tasks to run in parallel (max 5). Each task specifies an agent and what to do.')
        }),
        execute: async ({ tasks }, { abortSignal }) => {
            // Validate all agent IDs
            for (const t of tasks) {
                if (!agentRegistry.get(t.agentId)) {
                    throw new Error(
                        `Unknown agent: ${t.agentId}. Available agents: ${agentRegistry
                            .getAll()
                            .map((a) => a.id)
                            .join(', ')}`
                    );
                }
            }

            const results = await Promise.allSettled(
                tasks.map(async (t) => {
                    const agentDef = agentRegistry.get(t.agentId)!;
                    const taskMessage = t.context ? `Task: ${t.task}\n\nAdditional Context:\n${t.context}` : `Task: ${t.task}`;
                    const result = await executeAgentRun(agentDef, taskMessage, abortSignal);
                    return {
                        agentId: t.agentId,
                        task: t.task,
                        result: JSON.parse(result)
                    };
                })
            );

            const output = results.map((r, i) => {
                if (r.status === 'fulfilled') return r.value;
                return {
                    agentId: tasks[i]!.agentId,
                    task: tasks[i]!.task,
                    error: r.reason instanceof Error ? r.reason.message : String(r.reason)
                };
            });

            return JSON.stringify(output, null, 2);
        }
    });
    cachedParallelTool = parallelTool;
    return parallelTool;
}

/**
 * Tool that allows the current agent to hand off control to another agent.
 * The target agent receives the handoff message and runs to completion.
 */
export function createHandoffTool(currentAgentId?: string) {
    if (!currentAgentId && cachedHandoffTool) return cachedHandoffTool;
    const handoffTool = tool({
        description:
            'Transfer control to another specialized agent. The target agent will receive the message and continue the task. ' +
            'Use this for sequential workflows where one agent needs to hand off to another (e.g., planner → executor).\n\n' +
            'Available agents:\n' +
            agentRegistry
                .getAll()
                .filter((a) => a.id !== currentAgentId)
                .map((a) => `- ${a.id}: ${a.description}`)
                .join('\n'),
        inputSchema: z.object({
            agentId: z.string().describe('The ID of the agent to hand off to'),
            message: z.string().describe('The message or instructions to pass to the target agent. Include any context from the current conversation that the next agent needs.'),
            context: z.string().optional().describe('Additional structured context (e.g., file paths, findings so far)')
        }),
        execute: async ({ agentId, message, context }, { abortSignal }) => {
            const agentDef = agentRegistry.get(agentId);
            if (!agentDef) {
                throw new Error(
                    `Unknown agent: ${agentId}. Available: ${agentRegistry
                        .getAll()
                        .map((a) => a.id)
                        .join(', ')}`
                );
            }

            const handoffMessage = context ? `${message}\n\n---\nContext:\n${context}` : message;
            return executeAgentRun(agentDef, handoffMessage, abortSignal);
        }
    });
    if (!currentAgentId) cachedHandoffTool = handoffTool;
    return handoffTool;
}
