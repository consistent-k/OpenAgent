import fs from 'node:fs/promises';
import path from 'node:path';
import { t } from '@oagent/i18n';
import { resolveSafePath } from '@/utils/safe-path';

interface WriteFileResult {
    path: string;
    bytes: number;
    created: boolean;
    overwritten: boolean;
}

export async function writeFileContent(filePath: string, content: string, overwrite: boolean): Promise<WriteFileResult> {
    const resolved = resolveSafePath(filePath);

    // 使用原子写入：先写入临时文件，再重命名
    // 这样即使进程崩溃，也不会损坏原文件
    const tmpPath = `${resolved}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`;

    try {
        // 检查目标文件是否存在
        const existedBefore = await fs
            .access(resolved)
            .then(() => true)
            .catch((err: NodeJS.ErrnoException) => {
                if (err.code === 'ENOENT') {
                    return false;
                }
                throw err;
            });

        if (existedBefore && !overwrite) {
            throw new Error(t('tool.writeFile.fileAlreadyExists', { filePath }));
        }

        if (existedBefore) {
            const stat = await fs.stat(resolved);
            if (!stat.isFile()) {
                throw new Error(t('tool.writeFile.notAFile', { filePath }));
            }
        }

        // 确保目录存在
        await fs.mkdir(path.dirname(resolved), { recursive: true });

        // 写入临时文件
        await fs.writeFile(tmpPath, content, 'utf-8');

        // 原子重命名
        await fs.rename(tmpPath, resolved);

        return {
            path: filePath,
            bytes: Buffer.byteLength(content, 'utf-8'),
            created: !existedBefore,
            overwritten: existedBefore
        };
    } catch (err) {
        // 清理临时文件
        await fs.unlink(tmpPath).catch(() => {});
        throw err;
    }
}
