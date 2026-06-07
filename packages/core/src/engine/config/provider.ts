import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { wrapLanguageModel, type LanguageModelMiddleware } from 'ai';
import { getActiveProviderName, getApiKey, getBaseUrl } from '../../config';
import { createRetryNotificationMiddleware } from '../middleware/retry-notification';

/**
 * 供应商级缓存：按 (baseUrl, apiKey) 缓存 provider 实例，
 * 同一供应商的多个模型复用同一个 provider。
 */
const providerCache = new Map<string, ReturnType<typeof createOpenAICompatible>>();

function getCacheKey(baseUrl: string, apiKey: string): string {
    return `${baseUrl}\n${apiKey}`;
}

function getOrCreateProvider(): ReturnType<typeof createOpenAICompatible> {
    const baseUrl = getBaseUrl();
    const apiKey = getApiKey();
    const providerName = getActiveProviderName();
    const key = getCacheKey(baseUrl, apiKey);

    let provider = providerCache.get(key);
    if (!provider) {
        provider = createOpenAICompatible({
            name: providerName || 'custom',
            apiKey,
            baseURL: baseUrl
        });
        providerCache.set(key, provider);
    }

    return provider;
}

/**
 * 按供应商配置获取或创建 provider（供子 Agent 使用，复用缓存）。
 */
export function getOrCreateProviderByConfig(config: { name: string; baseUrl: string; apiKey: string }): ReturnType<typeof createOpenAICompatible> {
    const key = getCacheKey(config.baseUrl, config.apiKey);
    let provider = providerCache.get(key);
    if (!provider) {
        provider = createOpenAICompatible({
            name: config.name,
            apiKey: config.apiKey,
            baseURL: config.baseUrl
        });
        providerCache.set(key, provider);
    }
    return provider;
}

/**
 * 获取 AI provider。
 * 当传入 maxRetries 时，会在模型外层包裹重试通知中间件。
 */
export function getProvider(maxRetries?: number) {
    const provider = getOrCreateProvider();

    if (maxRetries != null && maxRetries > 0) {
        const middleware: LanguageModelMiddleware = createRetryNotificationMiddleware(maxRetries);
        return (modelId: string) =>
            wrapLanguageModel({
                model: provider.languageModel(modelId),
                middleware
            });
    }

    return (modelId: string) => provider.languageModel(modelId);
}
