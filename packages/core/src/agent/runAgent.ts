import { stepCountIs, streamText, type ModelMessage } from 'ai';
import { getMaxSteps, getModelName } from '../config';
import { getProvider } from './provider';
import getSkill from './skill';
import { getSystemPrompt } from './system-prompt';
import { tools } from './tools';

export async function runAgent(messages: ModelMessage[], abortSignal?: AbortSignal, opts?: { maxRetries?: number }) {
    const { skill } = await getSkill();
    return streamText({
        model: getProvider()(getModelName()),
        stopWhen: stepCountIs(getMaxSteps()),
        system: getSystemPrompt(),
        messages,
        tools: {
            skill,
            ...tools
        },
        abortSignal,
        maxRetries: opts?.maxRetries ?? 10,
        onError: ({ error }) => {
            console.error('[runAgent] stream error:', error);
        }
    });
}
