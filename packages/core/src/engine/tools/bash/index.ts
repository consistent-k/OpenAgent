import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { t } from '@oagent/i18n';
import { tool } from 'ai';
import { z } from 'zod';
import { isToolApproved } from '../utils/approval-store';
import { ROOT_DIR } from '@/utils/safe-path';

const execAsync = promisify(exec);

const MAX_OUTPUT_BYTES = 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 30_000;

const DANGEROUS_PATTERNS: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
    // 匹配 rm -rf / 或 rm / -rf 等变体（flags 可以在路径前或路径后）
    { pattern: /\brm\s+(-[a-zA-Z]*[rRfF][a-zA-Z]*\s+)+(\/|\/\*|~|\$HOME)(\s|$)/, reason: 'recursive delete of root or HOME' },
    { pattern: /\brm\s+(\/|\/\*|~|\$HOME)(\s+)(-[a-zA-Z]*[rRfF][a-zA-Z]*)/, reason: 'recursive delete of root or HOME' },
    { pattern: /\bmkfs(\.[a-z0-9]+)?\b/, reason: 'formatting filesystem' },
    { pattern: /\bdd\s+[^|;&]*\bof=\/dev\//, reason: 'writing to raw device' },
    { pattern: /(^|\s)sudo\s/, reason: 'privileged execution' },
    { pattern: /(^|\s)su\s+-/, reason: 'switching user' },
    { pattern: /\b(shutdown|reboot|halt|poweroff)\b/, reason: 'shutdown/reboot' },
    { pattern: /:\s*\(\s*\)\s*\{[^}]*:\s*\|\s*:[^}]*\}\s*;\s*:/, reason: 'fork bomb' },
    { pattern: />\s*\/dev\/(sd[a-z]|nvme|disk)/, reason: 'overwriting physical disk' }
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

function isSingleReadonlyCommand(cmd: string): boolean {
    const trimmed = cmd.trim();
    if (DANGEROUS_PATTERNS.some(({ pattern }) => pattern.test(trimmed))) {
        return false;
    }
    const hasSubst = /\$\s*\(|`[^`]*`/.test(trimmed);
    if (hasSubst) {
        return false;
    }
    const baseCommand = trimmed.split(/\s+/)[0]?.split('/').pop() ?? '';
    return READONLY_COMMANDS.has(baseCommand);
}

function isReadonlyCommand(command: string): boolean {
    const trimmed = command.trim();

    // 换行符也是 bash 命令分隔符，必须检查
    if (/\n/.test(trimmed)) {
        return false;
    }

    // 用 && 连接的命令，检查每一段是否都是只读
    const andParts = trimmed.split(/\s*&&\s*/);
    if (andParts.length > 1) {
        return andParts.every((part) => isSingleReadonlyCommand(part));
    }

    // 管道 | 是只读操作（如 cat file | grep pattern），不应阻止
    // 但 || (or)、>、<、&、; 是写操作或命令分隔符
    const hasShellOperators = /[<>]|\|\||[&;]/.test(trimmed);
    if (hasShellOperators) {
        return false;
    }

    return isSingleReadonlyCommand(trimmed);
}

function assertSafe(command: string): void {
    for (const { pattern, reason } of DANGEROUS_PATTERNS) {
        if (pattern.test(command)) {
            throw new Error(t('tool.bash.dangerRefused', { reason, command }));
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
    // 跳过 UTF-8 续字节，确保不截断多字节字符
    while (start < buf.length && (buf[start]! & 0xc0) === 0x80) {
        start++;
    }
    // 如果整个剩余缓冲区都是续字节（损坏的 UTF-8），回退到安全位置
    if (start >= buf.length) {
        start = Math.max(0, buf.length - maxBytes);
    }

    return {
        text: `${t('tool.bash.outputTruncated', { kb: Math.round((bytes - maxBytes) / 1024) })}\n\n${buf.subarray(start).toString('utf-8')}`,
        cut: true
    };
}

export const executeBashTool = tool({
    description:
        'Executes a given bash command and returns its output.\n\n' +
        "The working directory persists between commands, but shell state does not. The shell environment is initialized from the user's profile.\n\n" +
        'IMPORTANT: Avoid using this tool to run `grep`, `cat`, `head`, `tail`, `sed`, `awk`, or `echo` commands, unless explicitly instructed. Instead, use the appropriate dedicated tool:\n' +
        '- File search: Use glob (NOT find or ls)\n' +
        '- Content search: Use grep (NOT grep or rg)\n' +
        '- Read files: Use read_file (NOT cat/head/tail)\n' +
        '- Edit files: Use edit_file (NOT sed/awk)\n' +
        '- Write files: Use write_file (NOT echo/cat)\n\n' +
        'Supports pipes |, chaining &&/||, and output redirection >/>>/2>/2>>. Dangerous operations (rm -rf, sudo, mkfs, etc.) are blocked.',
    needsApproval: ({ command }) => {
        if (isToolApproved('execute_bash')) return false;
        return !isReadonlyCommand(command);
    },
    inputSchema: z.object({
        command: z
            .string()
            .describe(
                'The bash command to execute. E.g., "ls src", "which node", "npx antd usage ./src", "ls | grep .ts", "echo hello > output.txt && cat output.txt". Supports pipes |, chaining &&/||, output redirection >/>>/2>/2>>.'
            ),
        timeout: z.number().int().positive().optional().describe('Timeout in milliseconds. Defaults to 30000.')
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
