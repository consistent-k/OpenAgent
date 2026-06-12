import fs from 'node:fs';
import fsAsync from 'node:fs/promises';
import path from 'node:path';

/** 确保目录存在（同步） */
export function ensureDirSync(dir: string): void {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/** 确保目录存在（异步） */
export async function ensureDir(dir: string): Promise<void> {
    await fsAsync.mkdir(dir, { recursive: true });
}

/** 读取 JSON 文件，不存在或解析失败时返回 null */
export function readJsonFile<T>(filePath: string): T | null {
    if (!fs.existsSync(filePath)) return null;
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
    } catch {
        return null;
    }
}

/** 写入 JSON 文件，自动创建父目录 */
export function writeJsonFile(filePath: string, data: unknown, indent = 4): void {
    // 使用 path.dirname 替代手动截取，确保跨平台兼容（Windows 使用 \ 分隔符）
    ensureDirSync(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(data, null, indent), 'utf-8');
}
