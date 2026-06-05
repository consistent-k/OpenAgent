import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { wrapLanguageModel, type LanguageModelMiddleware } from 'ai';
import { getApiKey, getBaseUrl } from '../../config';
import { createRetryNotificationMiddleware } from '../middleware/retry-notification';

const baseProvider = () =>
    createOpenAICompatible({
        name: 'custom',
        apiKey: getApiKey(),
        baseURL: getBaseUrl()
    });

/**
 * 获取 AI provider。
 * 当传入 maxRetries 时，会在模型外层包裹重试通知中间件。
 */
export function getProvider(maxRetries?: number) {
    const provider = baseProvider();

    if (maxRetries != null && maxRetries > 0) {
        const middleware: LanguageModelMiddleware = createRetryNotificationMiddleware(maxRetries);
        // 返回一个与原 provider 签名一致的函数
        return (modelId: string) =>
            wrapLanguageModel({
                model: provider.languageModel(modelId),
                middleware
            });
    }

    return (modelId: string) => provider.languageModel(modelId);
}
