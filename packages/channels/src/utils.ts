/**
 * 共享工具函数
 */

/** 带 AbortSignal 支持的 sleep */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
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
