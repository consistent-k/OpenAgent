# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**oa** 是一个基于 Ink + AI SDK 的终端 AI Agent 客户端（TUI）。用户可以在终端中输入文本与 AI 对话，AI 可以调用工具读取/写入文件、执行 Bash 命令等。

## 开发命令

```bash
# 安装依赖
pnpm install

# 运行
pnpm start

# 编译（输出到 dist/index.js，带 #!/usr/bin/env node shebang）
pnpm build

# 质量检查
pnpm lint          # ESLint
pnpm lint:fix      # ESLint 自动修复
pnpm typecheck     # TypeScript 类型检查
pnpm test          # 运行测试
pnpm format        # Prettier 格式化

# 发布相关
pnpm pack:dry          # 本地打包预检
pnpm version:all patch # 统一升级版本号（patch/minor/major）
pnpm publish:all       # 发布所有包（自动检查版本一致性）
```

配置模型：`cp config.example.json ~/.openagent/config.json`，然后编辑 `providers` 数组填入供应商信息（`name`、`baseUrl`、`apiKey`、`models`），并设置 `activeModel` 为 `"供应商名/模型名"` 格式。也可以用环境变量 `OPENAGENT_BASE_URL`、`OPENAGENT_API_KEY`、`OPENAGENT_MODEL` 临时覆盖（会创建一个名为 `env` 的临时供应商）。

语言配置：`config.json` 中 `locale.lang` 字段控制界面语言（默认 `zh`），`locale.plugins` 可加载第三方语言扩展包。`/locale` 命令可查看和切换语言。

## 架构概览

完整项目结构参见 [docs/project-structure.md](docs/project-structure.md)。

### 核心数据流

1. `App.tsx` 中的 `useChatStream` hook 负责调用 `runAgent`，后者使用 AI SDK 的 `streamText` 与模型交互。
2. 用户输入以 `/` 开头时，通过 `commands/registry.ts` 的 `findCommand` 匹配并执行；否则作为普通消息 `send()` 到 AI。
3. 工具调用结果通过 `pendingApproval` 状态触发 `Input` 组件中的交互式确认框（批准/拒绝）。
4. 会话自动保存：`/clear` 时保存到 `~/.openagent/sessions/<sessionId>.json`，历史记录追加到 `~/.openagent/history.jsonl`。

## 添加新命令

在 `packages/core/src/commands/` 下新建文件，实现 `SlashCommand` 接口，然后在 `packages/core/src/commands/index.ts` 的 `COMMANDS` 数组中注册。

## 添加新工具

在 `packages/core/src/engine/tools/` 下新建文件，导出 `tool({...})`，然后在 `packages/core/src/engine/tools/index.ts` 的 `tools` 对象中注册。

## Channel 插件系统

Channel 插件用于接入消息平台（微信、Telegram 等）。插件通过 `config.json` 的 `channels` 字段配置，`/channel` 命令动态加载。

### 内置插件

| 插件     | 包名               | 说明                  |
| -------- | ------------------ | --------------------- |
| 微信     | `@oagent/weixin`   | iLink 协议接入微信    |
| Telegram | `@oagent/telegram` | Telegram Bot API 接入 |

### 使用方式

1. 安装插件：`pnpm add @oagent/weixin` 或 `pnpm add @oagent/telegram`
2. 配置 `~/.openagent/config.json`：`{ "channels": ["@oagent/weixin"] }`
3. TUI 中：`/channel start weixin`

### 开发新插件

1. 创建包，依赖 `@oagent/channels`
2. 导出 `register(manager, { runAgent })` 函数
3. 实现 `Channel` 接口（id, name, status, start, stop, isConfigured, getStatusInfo）

## 关键技术栈

- **Ink 7** — TUI 渲染框架
- **AI SDK (`ai`)** — 流式文本生成 + 工具调用
- **React 19** — UI 组件
- **TypeScript** — 路径别名 `@/*` 映射到 `./packages/core/src/*`
- **@oagent/i18n** — 国际化（内置 zh/en，支持第三方语言扩展包）
- **tsup** — 构建工具，ESM 格式输出，target Node 22
- **tsx** — TypeScript 运行时
- 要求 Node >= 22，pnpm >= 10.32.1
