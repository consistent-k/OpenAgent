import os from 'node:os';
import path from 'node:path';
import { setLocale, t } from '@oagent/i18n';
import { getErrorMessage } from '@/utils/errors';
import { readJsonFile, writeJsonFile } from '@/utils/fs';

export const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.next', 'coverage', '.cache', 'out']);

export const APP_NAME = 'Open Agent';

/** 获取 ~/.openagent 目录路径 */
export function getOpenAgentDir(): string {
    return path.join(os.homedir(), '.openagent');
}

export const CONFIG_PATH = path.join(getOpenAgentDir(), 'config.json');
export const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const DEFAULT_MAX_STEPS = 20;

interface OpenAgentConfig {
    baseUrl?: string;
    apiKey?: string;
    model?: string;
    maxSteps?: number;
    /** 启用的 channel 插件包名列表，如 ["@oagent/weixin"] */
    channels?: string[];
    /** 语言配置 */
    locale?: {
        /** 当前语言，如 'zh'、'en' */
        lang?: string;
        /** 语言扩展包名列表，如 ["@oagent/locale-ja"] */
        plugins?: string[];
    };
}

const DEFAULT_CONFIG: OpenAgentConfig = {
    baseUrl: '',
    apiKey: '',
    model: '',
    maxSteps: 5
};

let cachedConfig: OpenAgentConfig | null = null;

function readEnvConfig(): OpenAgentConfig {
    return {
        baseUrl: process.env.OPENAGENT_BASE_URL,
        apiKey: process.env.OPENAGENT_API_KEY,
        model: process.env.OPENAGENT_MODEL,
        maxSteps: process.env.OPENAGENT_MAX_STEPS ? Number(process.env.OPENAGENT_MAX_STEPS) : undefined
    };
}

function readConfig(): OpenAgentConfig {
    if (cachedConfig) return cachedConfig;

    const envConfig = readEnvConfig();
    const hasRequiredEnv = envConfig.baseUrl && envConfig.apiKey && envConfig.model;

    const fileConfig = readJsonFile<OpenAgentConfig>(CONFIG_PATH);
    if (!fileConfig) {
        if (hasRequiredEnv) {
            cachedConfig = envConfig;
            return cachedConfig;
        }
        // 自动创建默认配置文件
        writeJsonFile(CONFIG_PATH, DEFAULT_CONFIG);
        cachedConfig = { ...DEFAULT_CONFIG };
        return cachedConfig;
    }

    try {
        cachedConfig = { ...fileConfig, ...Object.fromEntries(Object.entries(envConfig).filter(([, value]) => value !== undefined && value !== '')) };
        return cachedConfig;
    } catch (error) {
        if (hasRequiredEnv) {
            cachedConfig = envConfig;
            return cachedConfig;
        }
        throw new Error(t('error.config.readFailed', { path: CONFIG_PATH, error: getErrorMessage(error) }));
    }
}

/** 检查必填配置项（baseUrl / apiKey / model）是否都已填写 */
export function isConfigReady(): boolean {
    try {
        const config = readConfig();
        return !!(config.baseUrl?.trim() && config.apiKey?.trim() && config.model?.trim());
    } catch {
        return false;
    }
}

function getConfigValue(key: 'baseUrl' | 'apiKey' | 'model'): string {
    return readConfig()[key]?.trim() ?? '';
}

export function getApiKey(): string {
    return getConfigValue('apiKey');
}

export function getBaseUrl(): string {
    return getConfigValue('baseUrl');
}

export function getModelName(): string {
    return getConfigValue('model');
}

export function getMaxSteps(): number {
    const value = readConfig().maxSteps;
    if (value === undefined) return DEFAULT_MAX_STEPS;
    if (!Number.isInteger(value) || value < 1 || value > 20) {
        throw new Error(t('error.config.invalidMaxSteps'));
    }
    return value;
}

/** 获取配置的 channel 插件列表 */
export function getConfiguredChannels(): string[] {
    return readConfig().channels ?? [];
}

/** 获取配置的语言扩展包列表 */
export function getConfiguredLocalePlugins(): string[] {
    return readConfig().locale?.plugins ?? [];
}

/** 获取配置的语言设置，默认 'zh' */
export function getConfigLocale(): string {
    return readConfig().locale?.lang ?? 'zh';
}

export function getConfigSummary(): { baseUrl: string; model: string; maxSteps: number; apiKey: string; locale: string } {
    const apiKey = getApiKey();
    const maskedApiKey = apiKey ? (apiKey.length <= 8 ? '****' : `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`) : '';
    return {
        baseUrl: getBaseUrl(),
        model: getModelName(),
        maxSteps: getMaxSteps(),
        apiKey: maskedApiKey,
        locale: getConfigLocale()
    };
}

export function saveConfig(updates: Partial<OpenAgentConfig> & { locale?: string }): void {
    const current = readConfig();
    // 兼容：当 locale 为字符串时，写入 locale.lang
    const { locale, ...rest } = updates;
    const merged: OpenAgentConfig = { ...current, ...rest };
    if (typeof locale === 'string') {
        merged.locale = { ...current.locale, lang: locale };
        setLocale(locale);
    }
    writeJsonFile(CONFIG_PATH, merged);
    cachedConfig = merged;
}

export function reloadConfig(): OpenAgentConfig {
    cachedConfig = null;
    return readConfig();
}

export type { OpenAgentConfig };
