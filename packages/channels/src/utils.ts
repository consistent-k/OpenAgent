/**
 * 共享工具函数
 */

/** 带 AbortSignal 支持的 sleep */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        // 如果 signal 已经 aborted，立即 reject
        if (signal?.aborted) {
            reject(new Error('aborted'));
            return;
        }

        const t = setTimeout(resolve, ms);
        signal?.addEventListener(
            'abort',
            () => {
                clearTimeout(t);
                reject(new Error('aborted'));
            },
            { once: true }
        );
    });
}
