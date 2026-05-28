import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { tool } from 'ai';
import { z } from 'zod';
import { ROOT_DIR } from '@/utils/safe-path';

const execAsync = promisify(exec);

const MAX_OUTPUT_BYTES = 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 30_000;

const DANGEROUS_PATTERNS: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
    { pattern: /\brm\s+(-[a-zA-Z]*[rRfF][a-zA-Z]*\s+)+(\/|\/\*|~|\$HOME)(\s|$)/, reason: '递归删除根目录或 HOME' },
    { pattern: /\bmkfs(\.[a-z0-9]+)?\b/, reason: '格式化文件系统' },
    { pattern: /\bdd\s+[^|;&]*\bof=\/dev\//, reason: '写入裸设备' },
    { pattern: /(^|\s)sudo\s/, reason: '提权执行' },
    { pattern: /(^|\s)su\s+-/, reason: '切换用户' },
    { pattern: /\b(shutdown|reboot|halt|poweroff)\b/, reason: '关机/重启' },
    { pattern: /:\s*\(\s*\)\s*\{[^}]*:\s*\|\s*:[^}]*\}\s*;\s*:/, reason: 'fork bomb' },
    { pattern: />\s*\/dev\/(sd[a-z]|nvme|disk)/, reason: '覆盖物理磁盘' }
];

const READONLY_COMMANDS = new Set([
    'ls',
    'which',
    'pwd',
    'whoami',
    'date',
    'uname',
    'df',
    'du',
    'file',
    'type',
    'dirname',
    'basename',
    'realpath',
    'readlink',
    'tty',
    'export',
    'getconf',
    'true',
    'false',
    'echo',
    'stat',
    'nproc',
    'arch',
    'uptime',
    'free',
    'id',
    'groups',
    'users',
    'who',
    'w',
    'hostname',
    'cat',
    'head',
    'tail',
    'sort',
    'uniq',
    'wc',
    'strings',
    'tree',
    'grep',
    'rg',
    'diff',
    'man',
    'help',
    'info',
    'history'
]);

function isReadonlyCommand(command: string): boolean {
    const trimmed = command.trim();
    if (DANGEROUS_PATTERNS.some(({ pattern }) => pattern.test(trimmed))) {
        return false;
    }

    const hasShellOperators = /[<>|&]|\|\||;/.test(trimmed);
    if (hasShellOperators) {
        return false;
    }

    const hasSubst = /\$\s*\(|`[^`]*`/.test(trimmed);
    if (hasSubst) {
        return false;
    }

    const baseCommand = trimmed.split(/\s+/)[0]?.split('/').pop() ?? '';
    return READONLY_COMMANDS.has(baseCommand);
}

function assertSafe(command: string): void {
    for (const { pattern, reason } of DANGEROUS_PATTERNS) {
        if (pattern.test(command)) {
            throw new Error(`拒绝执行危险命令（${reason}）：${command}`);
        }
    }
}

function tail(text: string, maxBytes: number): { text: string; cut: boolean } {
    const bytes = Buffer.byteLength(text, 'utf-8');
    if (bytes <= maxBytes) {
        return { text, cut: false };
    }

    const buf = Buffer.from(text, 'utf-8');
    let start = buf.length - maxBytes;
    while (start < buf.length && (buf[start]! & 0xc0) === 0x80) {
        start++;
    }

    return {
        text: `...(输出截断，剩余 ${Math.round((bytes - maxBytes) / 1024)}KB 省略)\n\n${buf.subarray(start).toString('utf-8')}`,
        cut: true
    };
}

export const executeBashTool = tool({
    description:
        '在工作目录内执行命令行工具以查看信息或调用 CLI 工具（如 antd、npx、tsx 等）。支持管道 |、链式执行 &&/||、输出重定向 >/>>/2>/2>>。禁止危险操作（rm -rf /、sudo、mkfs 等）。复杂文件读取优先用 read_file，文件修改优先用 write_file 或 edit_file。',
    needsApproval: ({ command }) => !isReadonlyCommand(command),
    inputSchema: z.object({
        command: z
            .string()
            .describe(
                '命令及参数，如 "ls src"、"which node"、"npx antd usage ./src"、"ls | grep .ts"、"echo hello > output.txt && cat output.txt"；支持管道 |、链式执行 &&/||、输出重定向 >/>>/2>/2>>'
            ),
        timeout: z.number().int().positive().optional().describe('超时时间（毫秒），默认 30000')
    }),
    execute: async ({ command, timeout }, { abortSignal }) => {
        const effectiveTimeout = timeout ?? DEFAULT_TIMEOUT_MS;

        assertSafe(command);

        try {
            const { stdout, stderr } = await execAsync(command, {
                cwd: ROOT_DIR,
                timeout: effectiveTimeout,
                maxBuffer: MAX_OUTPUT_BYTES,
                shell: '/bin/bash',
                signal: abortSignal
            });

            return {
                command,
                exitCode: 0,
                stdout: stdout.trim(),
                stderr: stderr.trim() || undefined,
                truncated: false
            };
        } catch (err: unknown) {
            const e = err as {
                stdout?: string | Buffer;
                stderr?: string | Buffer;
                code?: number | string;
                killed?: boolean;
                signal?: string;
                message?: string;
            };

            const stdout = typeof e.stdout === 'string' ? e.stdout : (e.stdout?.toString('utf8') ?? '');
            const stderr = typeof e.stderr === 'string' ? e.stderr : (e.stderr?.toString('utf8') ?? '');

            let exitCode = 1;
            if (typeof e.code === 'number') {
                exitCode = e.code;
            } else if (e.killed && e.signal) {
                exitCode = 137;
            }

            const output = stdout || stderr || (e.message ?? '');
            const truncated = tail(output, MAX_OUTPUT_BYTES);

            return {
                command,
                exitCode,
                stdout: truncated.text,
                stderr: stderr || undefined,
                truncated: truncated.cut
            };
        }
    }
});
