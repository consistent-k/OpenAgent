import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.tsx'],
    format: 'esm',
    platform: 'node',
    target: 'node22',
    splitting: false,
    clean: true,
    outDir: '../../dist'
});
