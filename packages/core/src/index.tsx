#!/usr/bin/env node

if (process.argv.length > 2) {
    // 有子命令/参数 → 走 Commander CLI
    const { program } = await import('./cli');
    program.parse();
} else {
    // 无参数 → 启动 TUI
    const { render } = await import('ink');
    const { App } = await import('./App');
    render(<App />);
}
