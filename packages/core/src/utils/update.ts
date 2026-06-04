import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { t } from '@oagent/i18n';

const execAsync = promisify(exec);

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
export async function detectPackageManager(): Promise<PackageManager | null> {
    const checks: [PackageManager, () => Promise<string | null>][] = [
        ['pnpm', async () => parsePnpmVersion((await execAsync(`pnpm ls -g ${PKG_NAME} --json`, { encoding: 'utf-8', timeout: 10_000 })).stdout)],
        ['yarn', async () => parseYarnVersion((await execAsync(`yarn global list --json`, { encoding: 'utf-8', timeout: 10_000 })).stdout)],
        ['npm', async () => parseNpmVersion((await execAsync(`npm ls -g ${PKG_NAME} --depth=0 --json`, { encoding: 'utf-8', timeout: 10_000 })).stdout)]
    ];

    for (const [pm, getVersion] of checks) {
        try {
            if (await getVersion()) return pm;
        } catch {
            // ignore
        }
    }

    return null;
}

/**
 * 获取当前已安装的版本
 */
export async function getCurrentVersion(pm: PackageManager): Promise<string | null> {
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
        const { stdout } = await execAsync(commands[pm], {
            encoding: 'utf-8',
            timeout: 10_000
        });
        return parsers[pm](stdout);
    } catch {
        return null;
    }
}

/**
 * 从 npm registry 获取最新版本
 */
export async function getLatestVersion(): Promise<string | null> {
    try {
        const { stdout } = await execAsync(`npm view ${PKG_NAME} version`, {
            encoding: 'utf-8',
            timeout: 15_000
        });
        return stdout.trim() || null;
    } catch {
        return null;
    }
}

/**
 * 执行完整的更新流程：检测包管理器 → 比对版本 → 执行更新
 */
export async function runUpdate(): Promise<UpdateResult> {
    const pm = await detectPackageManager();
    if (!pm) {
        return {
            success: false,
            message: t('update.notInstalled', { pkgName: PKG_NAME })
        };
    }

    const current = await getCurrentVersion(pm);
    const latest = await getLatestVersion();

    if (current && latest && current === latest) {
        return { success: true, message: t('update.alreadyLatest', { version: current }) };
    }

    try {
        const updateCmds: Record<PackageManager, string> = {
            npm: `npm update -g ${PKG_NAME}`,
            pnpm: `pnpm update -g ${PKG_NAME}`,
            yarn: `yarn global upgrade ${PKG_NAME}`
        };
        const { stdout } = await execAsync(updateCmds[pm], {
            encoding: 'utf-8',
            timeout: 60_000
        });
        const output = stdout.trim();

        const newVersion = await getCurrentVersion(pm);
        return {
            success: true,
            message: `${t('update.success', { current: current ?? '?', newVersion: newVersion ?? '?' })}${output ? `\n\n${output}` : ''}`
        };
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, message: t('update.failed', { error: msg }) };
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
