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
    const real = fs.realpathSync(resolved);
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
