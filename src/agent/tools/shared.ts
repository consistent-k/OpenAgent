import fs from 'node:fs/promises';
import path from 'node:path';
import { resolveSafePath } from '@/utils/safe-path';

interface WriteFileResult {
    path: string;
    bytes: number;
    created: boolean;
    overwritten: boolean;
}

export async function writeFileContent(filePath: string, content: string, overwrite: boolean): Promise<WriteFileResult> {
    const resolved = resolveSafePath(filePath);
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
        throw new Error(`File already exists: ${filePath}`);
    }

    if (existedBefore) {
        const stat = await fs.stat(resolved);
        if (!stat.isFile()) {
            throw new Error(`Path exists but is not a file: ${filePath}`);
        }
    }

    await fs.mkdir(path.dirname(resolved), { recursive: true });
    await fs.writeFile(resolved, content, 'utf-8');
    return {
        path: filePath,
        bytes: Buffer.byteLength(content, 'utf-8'),
        created: !existedBefore,
        overwritten: existedBefore
    };
}
