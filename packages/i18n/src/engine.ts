interface LocaleEntry {
    code: string;
    label: string;
    source: string;
    translations: Record<string, string>;
}

const localeMap = new Map<string, LocaleEntry>();
let currentLocale = 'zh';

/**
 * 注册一个新语言（内置语言 + 第三方扩展包均通过此函数注册）
 * @param code 语言代码，如 'ja'
 * @param label 显示名称，如 '日本語'
 * @param translations 翻译字典
 * @param source 来源标识，如 '@oagent/locale-ja' 或 'built-in'
 * @returns 当 code 已存在时返回 false（翻译会被合并，label 保留先注册的）
 */
export function registerLocale(code: string, label: string, translations: Record<string, string>, source = 'built-in'): boolean {
    const existing = localeMap.get(code);
    if (existing) {
        // 合并翻译，后注册的覆盖已有的 key
        Object.assign(existing.translations, translations);
        if (existing.source !== source) {
            console.warn(`[i18n] locale "${code}" already registered by "${existing.source}", "${source}" merged translations only`);
        }
        return false;
    }
    localeMap.set(code, { code, label, source, translations });
    return true;
}

/** 获取当前语言代码 */
export function getLocale(): string {
    return currentLocale;
}

/**
 * 设置当前语言
 * @returns 设置成功返回 true，语言未注册时返回 false 并保持当前语言不变
 */
export function setLocale(locale: string): boolean {
    if (localeMap.has(locale)) {
        currentLocale = locale;
        return true;
    }
    console.warn(`[i18n] locale "${locale}" not registered, keeping "${currentLocale}"`);
    return false;
}

/** 获取所有可用语言（内置 + 已注册） */
export function getSupportedLocales(): Array<{ code: string; label: string; source: string }> {
    return Array.from(localeMap.values()).map(({ code, label, source }) => ({
        code,
        label,
        source
    }));
}

/**
 * 翻译函数
 * @param key 翻译键名
 * @param vars 模板变量，如 { count: 5, name: 'weixin' }
 *
 * 回退链：当前语言 → en → zh → 原始 key
 */
export function t(key: string, vars?: Record<string, string | number>): string {
    const current = localeMap.get(currentLocale);
    const en = localeMap.get('en');
    const zh = localeMap.get('zh');
    const template = current?.translations[key] ?? en?.translations[key] ?? zh?.translations[key] ?? key;
    if (!vars) return template;
    return Object.entries(vars).reduce((result, [k, v]) => result.replaceAll(`{${k}}`, String(v)), template);
}
