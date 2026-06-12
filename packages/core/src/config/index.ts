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

/** 单个供应商配置 */
export interface ProviderConfig {
    /** 供应商名称（唯一标识），如 "OpenAI"、"Anthropic" */
    name: string;
    /** API 接口地址 */
    baseUrl: string;
    /** API 密钥 */
    apiKey: string;
    /** 该供应商下的可用模型列表 */
    models: string[];
    /** 模型上下文窗口大小映射（可选），如 { "gpt-4o": 128000 } */
    contextWindows?: Record<string, number>;
}

/** 用户自定义 Agent 配置（config.json 中的 agents 字段） */
export interface UserAgentConfig {
    /** 唯一 Agent ID */
    id: string;
    /** 显示名称 */
    name?: string;
    /** 描述，供主 Agent 理解何时委托 */
    description?: string;
    /** 该 Agent 的系统提示 */
    systemPrompt: string;
    /** 允许的工具名列表，省略则允许所有工具 */
    allowedTools?: string[];
    /** 拒绝的工具名列表（优先于 allowedTools） */
    disallowedTools?: string[];
    /** 模型覆盖，格式 "Provider/Model" */
    model?: string;
    /** 步数覆盖 */
    maxSteps?: number;
    /** 重试次数覆盖 */
    maxRetries?: number;
    /** 子工具调用是否需要审批 */
    requireApproval?: boolean;
    /** 标签 */
    tags?: string[];
}

export interface OpenAgentConfig {
    /** 供应商列表 */
    providers?: ProviderConfig[];
    /** 当前激活的模型，格式 "供应商名/模型名"，如 "OpenAI/gpt-4o" */
    activeModel?: string;
    maxSteps?: number;
    /** 当前主题，如 'dark'、'light'、'mayday' */
    theme?: string;
    /** 启用的 channel 插件包名列表，如 ["@oagent/weixin"] */
    channels?: string[];
    /** 语言配置 */
    locale?: {
        /** 当前语言，如 'zh'、'en' */
        lang?: string;
        /** 语言扩展包名列表，如 ["@oagent/locale-ja"] */
        plugins?: string[];
    };
    /** 用户自定义 Agent 配置 */
    agents?: UserAgentConfig[];
    /** Agent 插件包名列表，如 ["@oagent/custom-agents"] */
    agentPlugins?: string[];

    // ---- 旧格式字段（仅用于向后兼容迁移检测） ----
    /** @deprecated 旧格式：顶层 baseUrl */
    baseUrl?: string;
    /** @deprecated 旧格式：顶层 apiKey */
    apiKey?: string;
    /** @deprecated 旧格式：顶层 model */
    model?: string;
}

const DEFAULT_CONFIG: OpenAgentConfig = {
    providers: [],
    activeModel: '',
    maxSteps: DEFAULT_MAX_STEPS
};

let cachedConfig: OpenAgentConfig | null = null;

/**
 * 检测旧格式配置并自动迁移为新的多供应商格式。
 * 旧格式特征：顶层存在 baseUrl / apiKey / model 字段。
 */
function migrateConfig(config: OpenAgentConfig): OpenAgentConfig {
    const hasOldFormat = config.baseUrl || config.apiKey || config.model;
    const hasNewFormat = config.providers && config.providers.length > 0;

    // 已经是新格式，或旧格式字段为空，无需迁移
    if (hasNewFormat || !hasOldFormat) return config;

    const provider: ProviderConfig = {
        name: 'Default',
        baseUrl: config.baseUrl ?? '',
        apiKey: config.apiKey ?? '',
        models: config.model ? [config.model] : []
    };

    const migrated: OpenAgentConfig = {
        providers: [provider],
        activeModel: config.model ? `Default/${config.model}` : '',
        maxSteps: config.maxSteps,
        channels: config.channels,
        locale: config.locale
    };

    // 写回迁移后的配置
    try {
        writeJsonFile(CONFIG_PATH, migrated);
    } catch {
        // 写入失败不阻塞运行，下次启动会再次迁移
    }

    return migrated;
}

interface ResolvedProvider {
    provider: ProviderConfig;
    modelName: string;
}

/**
 * 从 activeModel（"供应商名/模型名"）解析出对应的供应商和模型名。
 * 解析失败返回 null。
 */
function resolveActiveProvider(config: OpenAgentConfig): ResolvedProvider | null {
    const activeModel = config.activeModel?.trim();
    if (!activeModel) return null;

    const slashIndex = activeModel.indexOf('/');
    if (slashIndex === -1) return null;

    const providerName = activeModel.slice(0, slashIndex);
    const modelName = activeModel.slice(slashIndex + 1);
    if (!providerName || !modelName) return null;

    const provider = config.providers?.find((p) => p.name === providerName);
    if (!provider) return null;

    return { provider, modelName };
}

function readEnvConfig(): OpenAgentConfig {
    const baseUrl = process.env.OPENAGENT_BASE_URL;
    const apiKey = process.env.OPENAGENT_API_KEY;
    const model = process.env.OPENAGENT_MODEL;

    // 环境变量作为单供应商快捷覆盖
    if (baseUrl && apiKey && model) {
        return {
            providers: [
                {
                    name: 'env',
                    baseUrl,
                    apiKey,
                    models: [model]
                }
            ],
            activeModel: `env/${model}`,
            maxSteps: process.env.OPENAGENT_MAX_STEPS
                ? (() => {
                      const n = Number(process.env.OPENAGENT_MAX_STEPS);
                      return Number.isFinite(n) ? n : undefined;
                  })()
                : undefined
        };
    }

    return {};
}

function readConfig(): OpenAgentConfig {
    if (cachedConfig) return cachedConfig;

    const envConfig = readEnvConfig();
    const hasEnvProvider = envConfig.providers && envConfig.providers.length > 0;

    let fileConfig = readJsonFile<OpenAgentConfig>(CONFIG_PATH);
    if (!fileConfig) {
        if (hasEnvProvider) {
            cachedConfig = envConfig;
            return cachedConfig;
        }
        // 自动创建默认配置文件
        writeJsonFile(CONFIG_PATH, DEFAULT_CONFIG);
        cachedConfig = { ...DEFAULT_CONFIG };
        return cachedConfig;
    }

    try {
        // 迁移旧格式
        fileConfig = migrateConfig(fileConfig);

        // 环境变量配置优先：合并到供应商列表最前面
        if (hasEnvProvider) {
            const envProvider = envConfig.providers![0]!;
            const existingProviders = fileConfig.providers ?? [];
            // 替换或插入 env provider
            const filtered = existingProviders.filter((p) => p.name !== 'env');
            fileConfig = {
                ...fileConfig,
                providers: [envProvider, ...filtered],
                activeModel: envConfig.activeModel
            };
        }

        cachedConfig = fileConfig;
        return cachedConfig;
    } catch (error) {
        if (hasEnvProvider) {
            cachedConfig = envConfig;
            return cachedConfig;
        }
        throw new Error(t('error.config.readFailed', { path: CONFIG_PATH, error: getErrorMessage(error) }));
    }
}

/** 检查必填配置项是否都已填写（至少有一个供应商且 activeModel 有效） */
export function isConfigReady(): boolean {
    try {
        const config = readConfig();
        const resolved = resolveActiveProvider(config);
        if (!resolved) return false;
        return !!(resolved.provider.baseUrl?.trim() && resolved.provider.apiKey?.trim() && resolved.modelName.trim());
    } catch {
        return false;
    }
}

/** 获取当前激活供应商的 API Key */
export function getApiKey(): string {
    const config = readConfig();
    const resolved = resolveActiveProvider(config);
    return resolved?.provider.apiKey?.trim() ?? '';
}

/** 获取当前激活供应商的 Base URL */
export function getBaseUrl(): string {
    const config = readConfig();
    const resolved = resolveActiveProvider(config);
    return resolved?.provider.baseUrl?.trim() ?? '';
}

/** 获取当前激活的模型名（不含供应商前缀） */
export function getModelName(): string {
    const config = readConfig();
    const resolved = resolveActiveProvider(config);
    return resolved?.modelName ?? '';
}

/** 获取当前激活供应商的名称 */
export function getActiveProviderName(): string {
    const config = readConfig();
    const resolved = resolveActiveProvider(config);
    return resolved?.provider.name ?? '';
}

/** 获取所有供应商列表 */
export function getProviders(): ProviderConfig[] {
    return readConfig().providers ?? [];
}

/**
 * 获取所有可选模型列表，格式为 "供应商名/模型名"。
 * 遍历所有供应商的所有模型。
 */
export function getAllModelOptions(): string[] {
    const config = readConfig();
    const options: string[] = [];
    for (const provider of config.providers ?? []) {
        for (const model of provider.models) {
            options.push(`${provider.name}/${model}`);
        }
    }
    return options;
}

/**
 * 切换当前激活的模型。
 * @param providerName 供应商名称
 * @param modelName 模型名称
 */
export function setActiveModel(providerName: string, modelName: string): void {
    const config = readConfig();
    const provider = config.providers?.find((p) => p.name === providerName);
    if (!provider) {
        throw new Error(t('error.config.providerNotFound', { name: providerName }));
    }
    if (!provider.models.includes(modelName)) {
        throw new Error(t('error.config.modelNotFound', { model: modelName, provider: providerName }));
    }
    const activeModel = `${providerName}/${modelName}`;
    saveConfig({ activeModel });
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

/** 获取配置的主题设置，默认 'mayday' */
export function getConfigTheme(): string {
    return readConfig().theme ?? 'mayday';
}

/** 获取用户自定义 Agent 配置列表 */
export function getConfiguredAgents(): UserAgentConfig[] {
    return readConfig().agents ?? [];
}

/** 获取配置的 Agent 插件包名列表 */
export function getConfiguredAgentPlugins(): string[] {
    return readConfig().agentPlugins ?? [];
}

/** 获取模型的上下文窗口大小（从供应商配置中读取） */
export function getModelContextWindow(modelId: string): number | undefined {
    const providers = readConfig().providers ?? [];
    for (const p of providers) {
        if (p.contextWindows) {
            // modelId 格式: "ProviderName/ModelName"，需要匹配 ModelName 部分
            const modelName = modelId.includes('/') ? modelId.slice(modelId.indexOf('/') + 1) : modelId;
            if (modelName in p.contextWindows) return p.contextWindows[modelName];
        }
    }
    return undefined;
}

/** 获取单个供应商 */
export function getProvider(name: string): ProviderConfig | undefined {
    const config = readConfig();
    return config.providers?.find((p) => p.name === name);
}

/** 添加供应商 */
export function addProvider(provider: ProviderConfig): void {
    const config = readConfig();
    const existing = config.providers ?? [];
    if (existing.some((p) => p.name === provider.name)) {
        throw new Error(t('error.config.providerAlreadyExists', { name: provider.name }));
    }
    saveConfig({ providers: [...existing, provider] });
}

/** 删除供应商 */
export function deleteProvider(providerName: string): void {
    const config = readConfig();
    const existing = config.providers ?? [];
    const filtered = existing.filter((p) => p.name !== providerName);
    if (filtered.length === existing.length) {
        throw new Error(t('error.config.providerNotFound', { name: providerName }));
    }
    const updates: Partial<OpenAgentConfig> = { providers: filtered };
    // 如果删除的是当前 active 的供应商，清空 activeModel
    const activeProvider = config.activeModel?.split('/')[0];
    if (activeProvider === providerName) {
        updates.activeModel = '';
    }
    saveConfig(updates);
}

/** 更新供应商 */
export function updateProvider(providerName: string, updates: Partial<Omit<ProviderConfig, 'name'>> & { newName?: string }): void {
    const config = readConfig();
    const existing = config.providers ?? [];
    const idx = existing.findIndex((p) => p.name === providerName);
    if (idx === -1) {
        throw new Error(t('error.config.providerNotFound', { name: providerName }));
    }
    const { newName, ...rest } = updates;
    const target = existing[idx]!;
    const updated: ProviderConfig = { ...target, ...rest };
    if (newName && newName !== providerName) {
        if (existing.some((p) => p.name === newName)) {
            throw new Error(t('error.config.providerAlreadyExists', { name: newName }));
        }
        updated.name = newName;
        // 同步更新 activeModel
        const activeModel = config.activeModel;
        if (activeModel?.startsWith(`${providerName}/`)) {
            saveConfig({
                providers: existing.map((p, i) => (i === idx ? updated : p)),
                activeModel: activeModel.replace(`${providerName}/`, `${newName}/`)
            });
            return;
        }
    }
    const newProviders = existing.map((p, i) => (i === idx ? updated : p));
    saveConfig({ providers: newProviders });
}

/** 添加模型到供应商 */
export function addModel(providerName: string, modelName: string): void {
    const config = readConfig();
    const existing = config.providers ?? [];
    const provider = existing.find((p) => p.name === providerName);
    if (!provider) {
        throw new Error(t('error.config.providerNotFound', { name: providerName }));
    }
    if (provider.models.includes(modelName)) {
        throw new Error(t('error.config.modelAlreadyExists', { model: modelName, provider: providerName }));
    }
    const newProviders = existing.map((p) => (p.name === providerName ? { ...p, models: [...p.models, modelName] } : p));
    saveConfig({ providers: newProviders });
}

/** 从供应商删除模型 */
export function deleteModel(providerName: string, modelName: string): void {
    const config = readConfig();
    const existing = config.providers ?? [];
    const provider = existing.find((p) => p.name === providerName);
    if (!provider) {
        throw new Error(t('error.config.providerNotFound', { name: providerName }));
    }
    if (!provider.models.includes(modelName)) {
        throw new Error(t('error.config.modelNotFound', { model: modelName, provider: providerName }));
    }
    const newProviders = existing.map((p) => (p.name === providerName ? { ...p, models: p.models.filter((m) => m !== modelName) } : p));
    const updates: Partial<OpenAgentConfig> = { providers: newProviders };
    // 如果删除的是当前 active 的模型，清空 activeModel
    if (config.activeModel === `${providerName}/${modelName}`) {
        updates.activeModel = '';
    }
    saveConfig(updates);
}

export function getConfigSummary(): {
    provider: string;
    baseUrl: string;
    model: string;
    maxSteps: number;
    apiKey: string;
    locale: string;
} {
    const config = readConfig();
    const resolved = resolveActiveProvider(config);
    const apiKey = resolved?.provider.apiKey?.trim() ?? '';
    const maskedApiKey = apiKey ? (apiKey.length <= 8 ? '****' : `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`) : '';
    const maxStepsValue = config.maxSteps;
    const maxSteps = maxStepsValue !== undefined && Number.isInteger(maxStepsValue) && maxStepsValue >= 1 && maxStepsValue <= 20 ? maxStepsValue : DEFAULT_MAX_STEPS;
    return {
        provider: resolved?.provider.name ?? '',
        baseUrl: resolved?.provider.baseUrl?.trim() ?? '',
        model: resolved?.modelName ?? '',
        maxSteps,
        apiKey: maskedApiKey,
        locale: config.locale?.lang ?? 'zh'
    };
}

export function saveConfig(updates: Partial<OpenAgentConfig>): void {
    const current = readConfig();
    const merged: OpenAgentConfig = { ...current, ...updates };
    writeJsonFile(CONFIG_PATH, merged);
    cachedConfig = merged;
}

/** 保存 locale 配置（兼容旧的字符串格式） */
export function saveLocale(locale: string): void {
    const current = readConfig();
    const merged: OpenAgentConfig = { ...current, locale: { ...current.locale, lang: locale } };
    writeJsonFile(CONFIG_PATH, merged);
    cachedConfig = merged;
    setLocale(locale);
}

export function reloadConfig(): OpenAgentConfig {
    cachedConfig = null;
    return readConfig();
}
