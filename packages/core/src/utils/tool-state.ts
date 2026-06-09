/** 终态判断：工具调用是否已完成（成功/失败/拒绝） */
export function isTerminalToolState(state: string): boolean {
    return state === 'output-available' || state === 'output-error' || state === 'output-denied';
}
