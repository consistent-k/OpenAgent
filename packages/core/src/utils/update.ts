import { execSync } from 'node:child_process';

const PKG_NAME = '@oagent/oa';

export type PackageManager = 'npm' | 'pnpm' | 'yarn';

export interface UpdateResult {
    success: boolean;
    message: string;
}

/**
 * 检测当前全局安装 @oagent/oa 的包管理器
 * 检测顺序：pnpm → yarn → npm
 */
export function detectPackageManager(): PackageManager | null {
    const checks: [PackageManager, () => string | null][] = [
        ['pnpm', () => parsePnpmVersion(execSync(`pnpm ls -g ${PKG_NAME} --json`, { encoding: 'utf-8', timeout: 10_000, stdio: ['pipe', 'pipe', 'pipe'] }))],
        ['yarn', () => parseYarnVersion(execSync(`yarn global list --json`, { encoding: 'utf-8', timeout: 10_000, stdio: ['pipe', 'pipe', 'pipe'] }))],
        ['npm', () => parseNpmVersion(execSync(`npm ls -g ${PKG_NAME} --depth=0 --json`, { encoding: 'utf-8', timeout: 10_000, stdio: ['pipe', 'pipe', 'pipe'] }))]
    ];

    for (const [pm, getVersion] of checks) {
        try {
            if (getVersion()) return pm;
        } catch {
            // ignore
        }
    }

    return null;
}

/**
 * 获取当前已安装的版本
 */
export function getCurrentVersion(pm: PackageManager): string | null {
    try {
        const commands: Record<PackageManager, string> = {
            npm: `npm ls -g ${PKG_NAME} --depth=0 --json`,
            pnpm: `pnpm ls -g ${PKG_NAME} --json`,
            yarn: `yarn global list --json`
        };
        const parsers: Record<PackageManager, (json: string) => string | null> = {
            npm: parseNpmVersion,
            pnpm: parsePnpmVersion,
            yarn: parseYarnVersion
        };
        const json = execSync(commands[pm], {
            encoding: 'utf-8',
            timeout: 10_000,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        return parsers[pm](json);
    } catch {
        return null;
    }
}

/**
 * 从 npm registry 获取最新版本
 */
export function getLatestVersion(): string | null {
    try {
        const out = execSync(`npm view ${PKG_NAME} version`, {
            encoding: 'utf-8',
            timeout: 15_000,
            stdio: ['pipe', 'pipe', 'pipe']
        }).trim();
        return out || null;
    } catch {
        return null;
    }
}

/**
 * 执行完整的更新流程：检测包管理器 → 比对版本 → 执行更新
 */
export async function runUpdate(): Promise<UpdateResult> {
    const pm = detectPackageManager();
    if (!pm) {
        return {
            success: false,
            message: `❌ 未检测到全局安装的 ${PKG_NAME}，请先通过 npm install -g ${PKG_NAME} 安装。`
        };
    }

    const current = getCurrentVersion(pm);
    const latest = getLatestVersion();

    if (current && latest && current === latest) {
        return { success: true, message: `✅ 已是最新版本 v${current}` };
    }

    try {
        const updateCmds: Record<PackageManager, string> = {
            npm: `npm update -g ${PKG_NAME}`,
            pnpm: `pnpm update -g ${PKG_NAME}`,
            yarn: `yarn global upgrade ${PKG_NAME}`
        };
        const output = execSync(updateCmds[pm], {
            encoding: 'utf-8',
            timeout: 60_000,
            stdio: ['pipe', 'pipe', 'pipe']
        }).trim();

        const newVersion = getCurrentVersion(pm);
        return {
            success: true,
            message: `✅ 更新完成！v${current ?? '?'} → v${newVersion ?? '?'}\n请重启 oa 以使用新版本。${output ? `\n\n${output}` : ''}`
        };
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, message: `❌ 更新失败：${msg}` };
    }
}

// ── 解析函数 ──

function parseNpmVersion(json: string): string | null {
    try {
        const data = JSON.parse(json);
        return data?.dependencies?.[PKG_NAME]?.version ?? null;
    } catch {
        return null;
    }
}

function parsePnpmVersion(json: string): string | null {
    try {
        const data = JSON.parse(json);
        if (Array.isArray(data)) {
            for (const item of data) {
                const dep = item?.dependencies?.[PKG_NAME];
                if (dep?.version) return dep.version;
            }
        }
        return data?.dependencies?.[PKG_NAME]?.version ?? null;
    } catch {
        return null;
    }
}

function parseYarnVersion(json: string): string | null {
    try {
        for (const line of json.split('\n')) {
            if (!line.trim()) continue;
            const data = JSON.parse(line);
            const name: string = data?.name ?? '';
            if (name === PKG_NAME || name.startsWith(`${PKG_NAME}@`)) {
                return data?.version ?? null;
            }
        }
        return null;
    } catch {
        return null;
    }
}
