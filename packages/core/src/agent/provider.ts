import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { getApiKey, getBaseUrl } from '../config';

export function getProvider() {
    return createOpenAICompatible({
        name: 'custom',
        apiKey: getApiKey(),
        baseURL: getBaseUrl()
    });
}
