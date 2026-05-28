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
        throw new Error(`缺少配置文件 ${CONFIG_PATH}，请先创建并填入 baseUrl、apiKey、model，或设置 OPENAGENT_BASE_URL、OPENAGENT_API_KEY、OPENAGENT_MODEL`);
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

function getRequiredConfigValue(key: 'baseUrl' | 'apiKey' | 'model'): string {
    const value = readConfig()[key];
    if (!value || value.trim().length === 0) {
        throw new Error(`配置文件 ${CONFIG_PATH} 缺少字段 ${key}`);
    }
    return value;
}

export function getApiKey(): string {
    return getRequiredConfigValue('apiKey');
}

export function getBaseUrl(): string {
    return getRequiredConfigValue('baseUrl');
}

export function getModelName(): string {
    return getRequiredConfigValue('model');
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
    const maskedApiKey = apiKey.length <= 8 ? '****' : `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
    return {
        baseUrl: getBaseUrl(),
        model: getModelName(),
        maxSteps: getMaxSteps(),
        apiKey: maskedApiKey
    };
}
