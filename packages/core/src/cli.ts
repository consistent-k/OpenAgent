import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { t } from '@oagent/i18n';
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

export const program = new Command().name('oa').description(t('cli.description')).version(getVersion());

program
    .command('update')
    .description(t('cli.updateDescription'))
    .action(async () => {
        const result = await runUpdate();
        console.log(result.message);
        process.exit(result.success ? 0 : 1);
    });
