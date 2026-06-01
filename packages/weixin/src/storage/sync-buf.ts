/**
 * getUpdates 游标持久化
 * 简化自 @tencent-weixin/openclaw-weixin/src/storage/sync-buf.ts
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function resolveWeixinDir(): string {
    return path.join(os.homedir(), '.openagent', 'weixin');
}

function resolveAccountsDir(): string {
    return path.join(resolveWeixinDir(), 'accounts');
}

/** 获取游标文件路径 */
export function getSyncBufFilePath(accountId: string): string {
    return path.join(resolveAccountsDir(), `${accountId}.sync.json`);
}

export type SyncBufData = {
    get_updates_buf: string;
};

/** 加载持久化的 get_updates_buf */
export function loadGetUpdatesBuf(filePath: string): string | undefined {
    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw) as { get_updates_buf?: string };
        if (typeof data.get_updates_buf === 'string') {
            return data.get_updates_buf;
        }
    } catch {
        // file not found or invalid
    }
    return undefined;
}

/** 持久化 get_updates_buf */
export function saveGetUpdatesBuf(filePath: string, getUpdatesBuf: string): void {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({ get_updates_buf: getUpdatesBuf }), 'utf-8');
}
