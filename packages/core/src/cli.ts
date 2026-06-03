import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { runUpdate } from './utils/update';

function getVersion(): string {
    try {
        const __dirname = dirname(fileURLToPath(import.meta.url));
        const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf-8'));
        return pkg.version ?? '0.0.0';
    } catch {
        return '0.0.0';
    }
}

export const program = new Command().name('oa').description('OpenAgent - 终端 AI Agent 客户端').version(getVersion());

program
    .command('update')
    .description('通过 npm/pnpm/yarn 全局更新 oa 至最新版本')
    .action(async () => {
        const result = await runUpdate();
        console.log(result.message);
        process.exit(result.success ? 0 : 1);
    });
