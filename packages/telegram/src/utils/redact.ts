/**
 * 脱敏工具 — 防止敏感信息写入日志
 */

/** 截断字符串 */
export function truncate(s: string, maxLen = 200): string {
    if (s.length <= maxLen) return s;
    return s.slice(0, maxLen) + '…';
}

/** 脱敏 token：保留前 6 位和后 4 位 */
export function redactToken(token: string): string {
    if (token.length <= 12) return '***';
    return `${token.slice(0, 6)}...${token.slice(-4)}`;
}

/** 脱敏 URL 中的敏感参数 */
export function redactUrl(url: string): string {
    return url.replace(/(token=)[^&]*/gi, '$1***');
}
