/**
 * 微信账号凭证管理
 * 简化自 @tencent-weixin/openclaw-weixin/src/auth/accounts.ts
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { logger } from '../utils/logger';

export const DEFAULT_BASE_URL = 'https://ilinkai.weixin.qq.com';
export const CDN_BASE_URL = 'https://novac2c.cdn.weixin.qq.com/c2c';

// ---------------------------------------------------------------------------
// 账号索引（持久化的已注册账号 ID 列表）
// ---------------------------------------------------------------------------

function resolveWeixinStateDir(): string {
    return path.join(os.homedir(), '.openagent', 'weixin');
}

function resolveAccountIndexPath(): string {
    return path.join(resolveWeixinStateDir(), 'accounts.json');
}

/** 列出所有已注册的 accountId */
export function listIndexedWeixinAccountIds(): string[] {
    const filePath = resolveAccountIndexPath();
    try {
        if (!fs.existsSync(filePath)) return [];
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((id): id is string => typeof id === 'string' && id.trim() !== '');
    } catch {
        return [];
    }
}

/** 注册 accountId 到索引 */
export function registerWeixinAccountId(accountId: string): void {
    const dir = resolveWeixinStateDir();
    fs.mkdirSync(dir, { recursive: true });

    const existing = listIndexedWeixinAccountIds();
    if (existing.includes(accountId)) return;

    const updated = [...existing, accountId];
    fs.writeFileSync(resolveAccountIndexPath(), JSON.stringify(updated, null, 2), 'utf-8');
}

/** 从索引中移除 accountId */
export function unregisterWeixinAccountId(accountId: string): void {
    const existing = listIndexedWeixinAccountIds();
    const updated = existing.filter((id) => id !== accountId);
    if (updated.length !== existing.length) {
        fs.writeFileSync(resolveAccountIndexPath(), JSON.stringify(updated, null, 2), 'utf-8');
    }
}

/**
 * 清除与当前账号共享同一 userId 的旧账号
 */
export function clearStaleAccountsForUserId(currentAccountId: string, userId: string, onClearContextTokens?: (accountId: string) => void): void {
    if (!userId) return;
    const allIds = listIndexedWeixinAccountIds();
    for (const id of allIds) {
        if (id === currentAccountId) continue;
        const data = loadWeixinAccount(id);
        if (data?.userId?.trim() === userId) {
            logger.info(`clearStaleAccountsForUserId: removing stale account=${id} (same userId=${userId})`);
            onClearContextTokens?.(id);
            clearWeixinAccount(id);
            unregisterWeixinAccountId(id);
        }
    }
}

// ---------------------------------------------------------------------------
// 账号凭证存储
// ---------------------------------------------------------------------------

/** 每个账号的持久化数据 */
export type WeixinAccountData = {
    token?: string;
    savedAt?: string;
    baseUrl?: string;
    /** 扫码登录时关联的微信用户 ID */
    userId?: string;
};

function resolveAccountsDir(): string {
    return path.join(resolveWeixinStateDir(), 'accounts');
}

function resolveAccountPath(accountId: string): string {
    return path.join(resolveAccountsDir(), `${accountId}.json`);
}

function readAccountFile(filePath: string): WeixinAccountData | null {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as WeixinAccountData;
        }
    } catch {
        // ignore
    }
    return null;
}

/** 加载账号数据 */
export function loadWeixinAccount(accountId: string): WeixinAccountData | null {
    return readAccountFile(resolveAccountPath(accountId));
}

/**
 * 持久化账号数据（合并到现有文件）
 */
export function saveWeixinAccount(accountId: string, update: { token?: string; baseUrl?: string; userId?: string }): void {
    const dir = resolveAccountsDir();
    fs.mkdirSync(dir, { recursive: true });

    const existing = loadWeixinAccount(accountId) ?? {};

    const token = update.token?.trim() || existing.token;
    const baseUrl = update.baseUrl?.trim() || existing.baseUrl;
    const userId = update.userId !== undefined ? update.userId.trim() || undefined : existing.userId?.trim() || undefined;

    const data: WeixinAccountData = {
        ...(token ? { token, savedAt: new Date().toISOString() } : {}),
        ...(baseUrl ? { baseUrl } : {}),
        ...(userId ? { userId } : {})
    };

    const filePath = resolveAccountPath(accountId);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    try {
        fs.chmodSync(filePath, 0o600);
    } catch {
        // best-effort
    }
}

/** 删除账号的所有关联文件 */
export function clearWeixinAccount(accountId: string): void {
    const dir = resolveAccountsDir();
    const accountFiles = [`${accountId}.json`, `${accountId}.sync.json`, `${accountId}.context-tokens.json`];
    for (const file of accountFiles) {
        try {
            fs.unlinkSync(path.join(dir, file));
        } catch {
            // ignore if not found
        }
    }
}

// ---------------------------------------------------------------------------
// 账号解析
// ---------------------------------------------------------------------------

export type ResolvedWeixinAccount = {
    accountId: string;
    baseUrl: string;
    cdnBaseUrl: string;
    token?: string;
    configured: boolean;
};

/** 解析微信账号配置 */
export function resolveWeixinAccount(accountId: string): ResolvedWeixinAccount {
    const raw = accountId?.trim();
    if (!raw) {
        throw new Error('weixin: accountId is required');
    }

    const accountData = loadWeixinAccount(raw);
    const token = accountData?.token?.trim() || undefined;
    const stateBaseUrl = accountData?.baseUrl?.trim() || '';

    return {
        accountId: raw,
        baseUrl: stateBaseUrl || DEFAULT_BASE_URL,
        cdnBaseUrl: CDN_BASE_URL,
        token,
        configured: Boolean(token)
    };
}
