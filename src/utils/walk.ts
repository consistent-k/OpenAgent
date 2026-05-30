import type { Dirent } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { SKIP_DIRS } from '@/config';

export interface WalkEntry {
    /** 相对于基准目录的路径（posix 风格） */
    relativePath: string;
    /** 绝对路径 */
    fullPath: string;
    entry: Dirent;
}

/**
 * 异步目录遍历，统一过滤 SKIP_DIRS 和隐藏文件。
 * yield 所有条目（文件和目录），通过 shouldRecurse 控制是否递归子目录。
 */
export async function* walkDirectory(
    dir: string,
    baseDir: string,
    options: {
        filterHidden?: boolean;
        shouldRecurse?: (entry: Dirent, relativePath: string) => boolean;
    } = {}
): AsyncGenerator<WalkEntry> {
    const { filterHidden = true, shouldRecurse } = options;

    let entries: Dirent[];
    try {
        entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
        return;
    }

    for (const entry of entries) {
        if (filterHidden && entry.name.startsWith('.')) continue;
        if (SKIP_DIRS.has(entry.name)) continue;

        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(baseDir, fullPath);

        yield { relativePath, fullPath, entry };

        if (entry.isDirectory()) {
            if (!shouldRecurse || shouldRecurse(entry, relativePath)) {
                yield* walkDirectory(fullPath, baseDir, options);
            }
        }
    }
}
