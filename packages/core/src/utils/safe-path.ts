import fs from 'node:fs';
import path from 'node:path';

/** 支持通过环境变量覆盖工作目录（用于微信机器人等子进程场景） */
export const ROOT_DIR = path.resolve(process.env.OPENAGENT_WORK_DIR || process.cwd());

export function resolveSafePath(relPath: string): string {
    const resolved = path.resolve(ROOT_DIR, relPath);
    const relative = path.relative(ROOT_DIR, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error('非法路径：超出工作目录范围');
    }
    // 防止 symlink 逃逸：解析真实路径后重新验证
    // 文件不存在时（新建场景），对父目录做检查；文件存在时直接检查文件本身
    let real: string;
    try {
        real = fs.realpathSync(resolved);
    } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
            // 文件不存在，检查父目录的 symlink 安全性
            const parentDir = path.dirname(resolved);
            const realParent = fs.realpathSync(parentDir);
            const parentRelative = path.relative(ROOT_DIR, realParent);
            if (parentRelative.startsWith('..') || path.isAbsolute(parentRelative)) {
                throw new Error('非法路径：父目录指向工作目录外');
            }
            // 返回拼接后的真实父目录 + 文件名
            return path.join(realParent, path.basename(resolved));
        }
        throw err;
    }
    const realRelative = path.relative(ROOT_DIR, real);
    if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) {
        throw new Error('非法路径：symlink 指向工作目录外');
    }
    return real;
}

/**
 * 读操作路径解析：不做工作目录限制，绝对路径直接使用，相对路径基于 ROOT_DIR 解析。
 */
export function resolveReadPath(filePath: string): string {
    return path.resolve(ROOT_DIR, filePath);
}
