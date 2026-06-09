/** 截断字符串，超出 max 长度时添加省略号（总长度不超过 max） */
export function truncate(str: string | undefined, max: number): string {
    if (!str) return '';
    if (str.length <= max) return str;
    return str.slice(0, max - 1) + '…';
}
