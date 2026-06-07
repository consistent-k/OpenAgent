/**
 * 共享日志工具
 * 通过工厂函数创建，按 channel 名称分目录写入
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const LOG_LEVELS: Record<string, number> = {
    TRACE: 1,
    DEBUG: 2,
    INFO: 3,
    WARN: 4,
    ERROR: 5
};

const DEFAULT_LEVEL = 'INFO';

function resolveMinLevel(): number {
    const env = process.env.OPENAGENT_LOG_LEVEL?.toUpperCase();
    if (env && env in LOG_LEVELS) return LOG_LEVELS[env];
    return LOG_LEVELS[DEFAULT_LEVEL];
}

function dateKey(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export interface ChannelLogger {
    info(msg: string): void;
    debug(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
}

/**
 * 创建 channel 日志实例
 * 日志写入 ~/.openagent/{channelName}/logs/{channelName}-{date}.log
 */
export function createLogger(channelName: string): ChannelLogger {
    const minLevel = resolveMinLevel();
    let logDirEnsured = false;

    function resolveLogDir(): string {
        return path.join(os.homedir(), '.openagent', channelName, 'logs');
    }

    function resolveLogPath(): string {
        return path.join(resolveLogDir(), `${channelName}-${dateKey()}.log`);
    }

    function writeLog(level: string, message: string): void {
        if (LOG_LEVELS[level] < minLevel) return;
        const now = new Date();
        const entry = JSON.stringify({
            level,
            time: now.toISOString(),
            msg: message
        });
        try {
            if (!logDirEnsured) {
                fs.mkdirSync(resolveLogDir(), { recursive: true });
                logDirEnsured = true;
            }
            fs.appendFileSync(resolveLogPath(), `${entry}\n`, 'utf-8');
        } catch {
            // 日志写入失败不阻塞主流程
        }
    }

    return {
        info(msg: string): void {
            writeLog('INFO', msg);
        },
        debug(msg: string): void {
            writeLog('DEBUG', msg);
        },
        warn(msg: string): void {
            writeLog('WARN', msg);
        },
        error(msg: string): void {
            writeLog('ERROR', msg);
        }
    };
}
