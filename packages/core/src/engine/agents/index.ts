import { stepCountIs, streamText, type ModelMessage } from 'ai';
import { getProvider } from '../config/provider';
import { getSystemPrompt } from '../config/system-prompt';
import getSkill from '../skill';
import { tools } from '../tools';
import { getMaxSteps, getModelName } from '@/config';

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
