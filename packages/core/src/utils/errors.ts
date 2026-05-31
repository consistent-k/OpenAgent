/** 从 unknown 错误中提取可读的错误信息 */
export function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
