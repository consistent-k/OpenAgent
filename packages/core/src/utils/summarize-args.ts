export function summarizeArgs(args: unknown, maxLength = 40): string {
    if (typeof args !== 'object' || args === null) {
        return String(args);
    }
    return Object.entries(args as Record<string, unknown>)
        .map(([k, v]) => {
            const s = typeof v === 'string' ? v : JSON.stringify(v);
            const trimmed = s.length > maxLength ? s.slice(0, maxLength) + '…' : s;
            return `${k}=${trimmed}`;
        })
        .join(', ');
}
