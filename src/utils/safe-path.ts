import fs from 'node:fs';
import path from 'node:path';

export const ROOT_DIR = path.resolve(process.cwd());

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
