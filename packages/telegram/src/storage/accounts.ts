/**
 * Telegram Bot Token 持久化
 * 存储到 ~/.openagent/telegram/account.json
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ACCOUNT_DIR = path.join(os.homedir(), '.openagent', 'telegram');
const ACCOUNT_FILE = path.join(ACCOUNT_DIR, 'account.json');

export interface TelegramAccount {
    token: string;
    botId?: string;
    botUsername?: string;
}

function ensureDir(): void {
    fs.mkdirSync(ACCOUNT_DIR, { recursive: true });
}

/** 加载已保存的账号 */
export function loadAccount(): TelegramAccount | null {
    try {
        const raw = fs.readFileSync(ACCOUNT_FILE, 'utf-8');
        return JSON.parse(raw) as TelegramAccount;
    } catch {
        return null;
    }
}

/** 保存账号 */
export function saveAccount(account: TelegramAccount): void {
    ensureDir();
    fs.writeFileSync(ACCOUNT_FILE, JSON.stringify(account, null, 2), 'utf-8');
    // 限制文件权限为仅所有者可读写（保护 bot token）
    fs.chmodSync(ACCOUNT_FILE, 0o600);
}

/** 清除账号 */
export function clearAccount(): void {
    try {
        fs.unlinkSync(ACCOUNT_FILE);
    } catch {
        // 文件不存在时忽略
    }
}

/** 检查是否已配置 */
export function hasAccount(): boolean {
    return loadAccount() !== null;
}
