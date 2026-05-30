import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.next', 'coverage', '.cache', 'out']);

export const APP_NAME = 'Open Agent';

const CONFIG_PATH = path.join(os.homedir(), '.openagent', 'config.json');
const DEFAULT_MAX_STEPS = 20;

interface OpenAgentConfig {
    baseUrl?: string;
    apiKey?: string;
    model?: string;
    maxSteps?: number;
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

    if (!fs.existsSync(CONFIG_PATH)) {
        if (hasRequiredEnv) {
            cachedConfig = envConfig;
            return cachedConfig;
        }
        // 自动创建默认配置文件
        const dir = path.dirname(CONFIG_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 4), 'utf-8');
        cachedConfig = { ...DEFAULT_CONFIG };
        return cachedConfig;
    }

    try {
        const fileConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) as OpenAgentConfig;
        cachedConfig = { ...fileConfig, ...Object.fromEntries(Object.entries(envConfig).filter(([, value]) => value !== undefined && value !== '')) };
        return cachedConfig;
    } catch (error) {
        if (hasRequiredEnv) {
            cachedConfig = envConfig;
            return cachedConfig;
        }
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`读取配置文件失败：${CONFIG_PATH}\n${message}`);
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
        throw new Error(`配置字段 maxSteps 必须是 1 到 20 之间的整数`);
    }
    return value;
}

export function getConfigSummary(): { baseUrl: string; model: string; maxSteps: number; apiKey: string } {
    const apiKey = getApiKey();
    const maskedApiKey = apiKey ? (apiKey.length <= 8 ? '****' : `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`) : '';
    return {
        baseUrl: getBaseUrl(),
        model: getModelName(),
        maxSteps: getMaxSteps(),
        apiKey: maskedApiKey
    };
}

export function saveConfig(updates: Partial<OpenAgentConfig>): void {
    const current = readConfig();
    const merged = { ...current, ...updates };
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 4), 'utf-8');
    cachedConfig = merged;
}

export function reloadConfig(): OpenAgentConfig {
    cachedConfig = null;
    return readConfig();
}

export type { OpenAgentConfig };
