import { stepCountIs, streamText, type ModelMessage } from 'ai';
import { getProvider } from '../config/provider';
import { getSystemPrompt } from '../config/system-prompt';
import getSkill from '../skill';
import { tools } from '../tools';
import { createUnifiedAgentTool, invalidateAgentToolCache } from './agent-tool';
import { loadAllAgents } from './loader';
import { getMaxSteps, getModelName } from '@/config';

let agentsLoaded = false;

/** Registered callbacks to run on agent reload (e.g., command cache invalidation) */
const onReloadCallbacks: Array<() => void> = [];

export function onAgentReload(callback: () => void): void {
    onReloadCallbacks.push(callback);
}

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
    for (const cb of onReloadCallbacks) cb();
    await loadAllAgents();
    agentsLoaded = true;
}

/**
 * 当模型连续 N 步只生成文本（无工具调用）时提前终止。
 * 解决部分模型在工具调用完成后陷入重复生成的问题。
 */
const MAX_CONSECUTIVE_TEXT_ONLY_STEPS = 5;

export async function runAgent(messages: ModelMessage[], abortSignal?: AbortSignal, opts?: { maxRetries?: number }) {
    await ensureAgentsLoaded();

    const { skill } = await getSkill();
    const maxRetries = opts?.maxRetries ?? 10;

    // Build the complete tool set: existing tools + unified agent tool
    const agentTool = createUnifiedAgentTool();

    // 用于检测连续纯文本步骤的 AbortController
    const earlyStopController = new AbortController();
    let consecutiveTextOnlySteps = 0;

    const mergedSignal = abortSignal ? AbortSignal.any([abortSignal, earlyStopController.signal]) : earlyStopController.signal;

    return streamText({
        model: getProvider(maxRetries)(getModelName()),
        stopWhen: stepCountIs(getMaxSteps()),
        system: getSystemPrompt(),
        messages,
        tools: {
            skill,
            ...tools,
            agent: agentTool
        },
        abortSignal: mergedSignal,
        maxRetries,
        onStepFinish({ toolCalls }) {
            if (!toolCalls || toolCalls.length === 0) {
                consecutiveTextOnlySteps++;
                if (consecutiveTextOnlySteps >= MAX_CONSECUTIVE_TEXT_ONLY_STEPS) {
                    earlyStopController.abort();
                }
            } else {
                consecutiveTextOnlySteps = 0;
            }
        }
    });
}
