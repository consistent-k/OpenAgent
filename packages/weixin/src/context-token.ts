/**
 * 微信 contextToken 管理
 * 提取自 @tencent-weixin/openclaw-weixin/src/messaging/inbound.ts
 * contextToken 用于后续请求的会话上下文
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { logger } from './logger.js';

/** 内存缓存: key 为 `{accountId}:{userId}` */
const contextTokens = new Map<string, string>();

function resolveAccountsDir(): string {
    return path.join(os.homedir(), '.openagent', 'weixin', 'accounts');
}

function resolveContextTokenPath(accountId: string): string {
    return path.join(resolveAccountsDir(), `${accountId}.context-tokens.json`);
}

function buildKey(accountId: string, userId: string): string {
    return `${accountId}:${userId}`;
}

/** 设置 contextToken（内存 + 磁盘） */
export function setContextToken(accountId: string, userId: string, token: string): void {
    const key = buildKey(accountId, userId);
    contextTokens.set(key, token);

    try {
        const filePath = resolveContextTokenPath(accountId);
        const dir = path.dirname(filePath);
        fs.mkdirSync(dir, { recursive: true });

        // 加载现有数据并更新
        let data: Record<string, string> = {};
        try {
            const raw = fs.readFileSync(filePath, 'utf-8');
            data = JSON.parse(raw);
        } catch {
            // 文件不存在或解析失败，使用空对象
        }
        data[userId] = token;
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
        logger.error(`setContextToken: failed to persist: ${String(err)}`);
    }
}

/** 获取 contextToken（从内存） */
export function getContextToken(accountId: string, userId: string): string | undefined {
    return contextTokens.get(buildKey(accountId, userId));
}

/** 从磁盘恢复 contextToken 到内存 */
export function restoreContextTokens(accountId: string): void {
    try {
        const filePath = resolveContextTokenPath(accountId);
        if (!fs.existsSync(filePath)) return;
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw) as Record<string, string>;
        for (const [userId, token] of Object.entries(data)) {
            if (typeof token === 'string' && token.trim()) {
                contextTokens.set(buildKey(accountId, userId), token);
            }
        }
        logger.info(`restoreContextTokens: loaded ${Object.keys(data).length} tokens for ${accountId}`);
    } catch (err) {
        logger.warn(`restoreContextTokens: failed to load: ${String(err)}`);
    }
}

/** 清除某账号的所有 contextToken */
export function clearContextTokensForAccount(accountId: string): void {
    const prefix = `${accountId}:`;
    for (const key of contextTokens.keys()) {
        if (key.startsWith(prefix)) {
            contextTokens.delete(key);
        }
    }
    try {
        const filePath = resolveContextTokenPath(accountId);
        fs.unlinkSync(filePath);
    } catch {
        // ignore
    }
}
