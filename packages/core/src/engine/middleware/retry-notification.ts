import { APICallError, type LanguageModelMiddleware } from 'ai';
import { extractApiErrorMessage } from '../../utils/errors';

/** 重试信息 */
export interface RetryInfo {
    attempt: number;
    maxRetries: number;
    errorMessage: string;
    retryDelayMs: number;
}

/** 全局回调 — UI 层设置 */
let onRetryCallback: ((info: RetryInfo) => void) | null = null;

export function setRetryCallback(cb: (info: RetryInfo) => void) {
    onRetryCallback = cb;
}

export function clearRetryCallback() {
    onRetryCallback = null;
}

/**
 * 从 API 错误的响应头中提取重试延迟时间（ms）
 * 逻辑与 AI SDK 内部 retry-with-exponential-backoff 保持一致
 */
function extractRetryDelayMs(error: APICallError, exponentialBackoffMs: number): number {
    const headers = error.responseHeaders;
    if (!headers) return exponentialBackoffMs;

    // retry-after-ms（OpenAI 等使用，精度更高）
    const retryAfterMs = headers['retry-after-ms'];
    if (retryAfterMs) {
        const ms = parseFloat(retryAfterMs);
        if (!Number.isNaN(ms) && ms >= 0 && ms < 60_000) return ms;
    }

    // Retry-After（标准 HTTP 头）
    const retryAfter = headers['retry-after'];
    if (retryAfter) {
        const seconds = parseFloat(retryAfter);
        if (!Number.isNaN(seconds) && seconds >= 0) {
            const ms = seconds * 1000;
            if (ms < 60_000) return ms;
        }
        // 也可能是一个 HTTP-date
        const parsed = Date.parse(retryAfter);
        if (!Number.isNaN(parsed)) {
            const ms = parsed - Date.now();
            if (ms >= 0 && ms < 60_000) return ms;
        }
    }

    return exponentialBackoffMs;
}

/**
 * 创建重试通知中间件
 *
 * 中间件的 wrapStream 在 AI SDK retry 循环内部调用：
 *   streamText → retry loop → middleware.wrapStream → model.doStream
 * 每次重试都会重新进入 wrapStream，因此通过闭包计数器追踪重试次数。
 */
export function createRetryNotificationMiddleware(maxRetries: number): LanguageModelMiddleware {
    // 注意：attemptCount 必须在 wrapStream 外部初始化，因为每次重试都会重新调用 wrapStream
    let attemptCount = 0;
    const initialDelayMs = 2000;
    const backoffFactor = 2;

    return {
        specificationVersion: 'v3',
        async wrapStream({ doStream }) {
            // 不要在这里重置 attemptCount！
            // 重试循环在外层，每次重试都会重新进入 wrapStream
            try {
                return await doStream();
            } catch (error) {
                if (APICallError.isInstance(error) && error.statusCode === 429) {
                    attemptCount++;
                    // 计算本次重试的指数退避延迟（与 SDK 内部一致）
                    const exponentialDelay = initialDelayMs * Math.pow(backoffFactor, attemptCount - 1);
                    const retryDelayMs = extractRetryDelayMs(error, exponentialDelay);

                    const errorMessage = extractApiErrorMessage(error);

                    onRetryCallback?.({
                        attempt: attemptCount,
                        maxRetries,
                        errorMessage,
                        retryDelayMs
                    });
                }
                throw error;
            }
        }
    };
}
