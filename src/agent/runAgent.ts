import { stepCountIs, streamText, type ModelMessage } from 'ai';
import { getMaxSteps, getModelName } from '../config';
import { getProvider } from './provider';
import getSkill from './skill';
import { getSystemPrompt } from './system-prompt';
import { tools } from './tools';

export async function runAgent(messages: ModelMessage[], abortSignal?: AbortSignal) {
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
        maxRetries: 10,
        onError: ({ error: _error }) => {
            // 记录错误信息，但不阻止错误传播到 UI
            // console.error('Stream error:', error);
        }
    });
}
