/** 从 unknown 错误中提取可读的错误信息 */
export function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

/** 从 API 错误中提取可读的错误信息（解析 responseBody JSON） */
export function extractApiErrorMessage(err: unknown): string {
    const e = err as { responseBody?: string };
    if (e.responseBody) {
        try {
            const body = JSON.parse(e.responseBody);
            if (body.error?.message) return body.error.message;
        } catch {
            // not JSON
        }
    }
    return getErrorMessage(err);
}
