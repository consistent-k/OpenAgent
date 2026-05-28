import { stepCountIs, streamText, type ModelMessage } from 'ai';
import { getMaxSteps, getModelName } from '../config';
import { getProvider } from './provider';
import getSkill from './skill';
import { tools } from './tools';

export async function runAgent(messages: ModelMessage[], abortSignal?: AbortSignal) {
    const { skill } = await getSkill();
    return streamText({
        model: getProvider()(getModelName()),
        stopWhen: stepCountIs(getMaxSteps()),
        messages,
        tools: {
            skill,
            ...tools
        },
        abortSignal
    });
}
