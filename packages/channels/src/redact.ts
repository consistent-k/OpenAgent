/**
 * 日志脱敏工具（共享）
 */

const DEFAULT_BODY_MAX_LEN = 200;
const DEFAULT_TOKEN_PREFIX_LEN = 6;

/** 截断字符串 */
export function truncate(s: string | undefined, max: number): string {
    if (!s) return '';
    if (s.length <= max) return s;
    return `${s.slice(0, max)}…(len=${s.length})`;
}

/** 脱敏 token：保留前缀，显示长度 */
export function redactToken(token: string | undefined, prefixLen = DEFAULT_TOKEN_PREFIX_LEN): string {
    if (!token) return '(none)';
    if (token.length <= prefixLen) return `****(len=${token.length})`;
    return `${token.slice(0, prefixLen)}…(len=${token.length})`;
}

/** 脱敏请求体中的敏感字段 */
export function redactBody(body: string | undefined, maxLen = DEFAULT_BODY_MAX_LEN): string {
    if (!body) return '(empty)';
    const redacted = body.replace(/"(context_token|bot_token|token|authorization|Authorization)"\s*:\s*"[^"]*"/g, '"$1":"<redacted>"');
    if (redacted.length <= maxLen) return redacted;
    return `${redacted.slice(0, maxLen)}…(truncated, totalLen=${redacted.length})`;
}

/** 脱敏 URL 中的查询参数 */
export function redactUrl(rawUrl: string): string {
    try {
        const u = new URL(rawUrl);
        const base = `${u.origin}${u.pathname}`;
        return u.search ? `${base}?<redacted>` : base;
    } catch {
        return truncate(rawUrl, 80);
    }
}
