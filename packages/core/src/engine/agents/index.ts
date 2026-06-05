import { stepCountIs, streamText, type ModelMessage } from 'ai';
import { getProvider } from '../config/provider';
import { getSystemPrompt } from '../config/system-prompt';
import getSkill from '../skill';
import { tools } from '../tools';
import { getMaxSteps, getModelName } from '@/config';

export async function runAgent(messages: ModelMessage[], abortSignal?: AbortSignal, opts?: { maxRetries?: number }) {
    const { skill } = await getSkill();
    const maxRetries = opts?.maxRetries ?? 10;
    return streamText({
        model: getProvider(maxRetries)(getModelName()),
        stopWhen: stepCountIs(getMaxSteps()),
        system: getSystemPrompt(),
        messages,
        tools: {
            skill,
            ...tools
        },
        abortSignal,
        maxRetries
    });
}
