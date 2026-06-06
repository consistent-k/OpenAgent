# Open Agent 开发指南

## 启动与安装（开发版）

```bash
# 安装依赖
pnpm install

# 运行（首次运行会自动进入配置向导）
pnpm start
```

## 编译

```bash
pnpm build
```

编译产物会输出到 `dist/index.js`，并带有 `#!/usr/bin/env node`，可以作为命令行程序执行。

## 在其他目录使用

开发时可以用本地链接安装 `oa`：

```bash
pnpm build
pnpm link --global

cd /path/to/your/project
oa
```

`oa` 会以你执行命令时的目录作为工作目录，文件索引、读取、写入和命令执行都会限制在该目录下。

## 环境变量

```bash
OPENAGENT_BASE_URL="https://api.example.com/v1" \
OPENAGENT_API_KEY="sk-..." \
OPENAGENT_MODEL="gpt-4.1" \
OPENAGENT_MAX_STEPS="5" \
oa
```

## 项目上下文 (AGENTS.md)

在项目根目录创建 `AGENTS.md` 文件，可以在启动时自动加载到系统提示词中，为 AI 提供项目特定的指导信息。例如：

```markdown
# 项目指南

这是一个 React 项目，使用 TypeScript 和 Vite。

## 编码规范

- 使用函数组件和 Hooks
- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
```

AI 会读取这些信息，更好地理解项目结构和开发规范。

## 质量检查

```bash
pnpm lint
pnpm typecheck
pnpm format
```

## 项目结构

完整项目结构参见 [project-structure.md](project-structure.md)。

## 添加新命令

在 `packages/core/src/commands/` 下新建一个文件，实现 `SlashCommand` 接口，然后在 `packages/core/src/commands/index.ts` 的 `COMMANDS` 数组中注册。

## 添加新工具

在 `packages/core/src/engine/tools/` 下新建文件，导出 `tool({...})`，再到 `packages/core/src/engine/tools/index.ts` 注册。

## 开发自定义 Channel 插件

创建一个 npm 包，导出 `register` 函数：

```typescript
import type { ChannelManager } from '@oagent/channels';

export function register(manager: ChannelManager, opts: { runAgent: RunAgentFn; enableAutoApprove?: () => Promise<void> }): void {
    manager.register(new MyChannel(opts));
}
```

实现 `Channel` 接口：

```typescript
import type { Channel, ChannelStartOpts, ChannelStatus } from '@oagent/channels';

export class MyChannel implements Channel {
    readonly id = 'my-channel';
    readonly name = 'My Channel';
    status: ChannelStatus = 'idle';

    isConfigured(): boolean {
        /* ... */
    }
    getStatusInfo(): string[] {
        /* ... */
    }
    async start(opts: ChannelStartOpts): Promise<void> {
        /* ... */
    }
    async stop(): Promise<void> {
        /* ... */
    }
}
```
