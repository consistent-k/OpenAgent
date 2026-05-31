import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['index.ts'],
    format: 'esm',
    platform: 'node',
    target: 'node22',
    splitting: false,
    clean: true,
    outDir: 'dist'
});
