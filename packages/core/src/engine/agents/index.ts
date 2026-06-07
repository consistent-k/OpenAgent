import { stepCountIs, streamText, type ModelMessage } from 'ai';
import { getProvider } from '../config/provider';
import { getSystemPrompt } from '../config/system-prompt';
import getSkill from '../skill';
import { tools } from '../tools';
import { createAgentTools, createParallelAgentTool, createHandoffTool, invalidateAgentToolCache } from './agent-tool';
import { loadAllAgents } from './loader';
import { getMaxSteps, getModelName } from '@/config';

let agentsLoaded = false;

/**
 * Ensure agents are loaded. Called lazily on first runAgent invocation
 * and explicitly on /reload.
 */
export async function ensureAgentsLoaded(): Promise<void> {
    if (!agentsLoaded) {
        await loadAllAgents();
        agentsLoaded = true;
    }
}

/** Reload all agents from all sources */
export async function reloadAgents(): Promise<void> {
    invalidateAgentToolCache();
    await loadAllAgents();
    agentsLoaded = true;
}

export async function runAgent(messages: ModelMessage[], abortSignal?: AbortSignal, opts?: { maxRetries?: number }) {
    await ensureAgentsLoaded();

    const { skill } = await getSkill();
    const maxRetries = opts?.maxRetries ?? 10;

    // Build the complete tool set: existing tools + agent tools
    const agentTools = createAgentTools();
    const parallelTool = createParallelAgentTool();
    const handoffTool = createHandoffTool();

    return streamText({
        model: getProvider(maxRetries)(getModelName()),
        stopWhen: stepCountIs(getMaxSteps()),
        system: getSystemPrompt(),
        messages,
        tools: {
            skill,
            ...tools,
            ...agentTools,
            run_agents_parallel: parallelTool,
            agent_handoff: handoffTool
        },
        abortSignal,
        maxRetries
    });
}
