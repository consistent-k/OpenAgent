# Open Agent

基于 Ink + AI SDK 的终端 AI Agent 客户端（TUI）。在终端中直接与 AI 对话，AI 可以调用工具读取/写入文件、执行 Bash 命令、搜索代码、访问网页等，帮你完成开发任务。

**核心能力：**

- 内置工具：读写文件、执行命令、代码搜索（glob/grep）、网页搜索、文件抓取等
- `@文件` 补全：输入 `@` 即可模糊搜索并补全项目文件路径
- 斜杠命令：`/clear`、`/load`、`/config`、`/theme` 等快捷操作
- 交互式确认：写入文件等敏感操作前弹出确认框，由你决定是否执行
- 会话管理：自动保存历史会话，随时恢复上下文继续对话
- 流式响应：实时展示 AI 的思考过程和工具调用细节
- Skill 系统：从 `~/.agents/skills` 目录加载自定义 Skill，扩展 Agent 的能力
- Channel 插件：通过插件系统接入微信等消息平台，实现远程控制

## 启动与安装

```bash
# 1. 安装依赖
pnpm install

# 2. 配置模型参数
mkdir -p ~/.openagent
cp config.example.json ~/.openagent/config.json
# 然后编辑 ~/.openagent/config.json，填入 baseUrl、apiKey、model
# maxSteps 可选，默认 20，用于限制单次回复的工具调用步数（1~20）

# 3. 运行
pnpm start
# 或开发模式（文件变更自动重启）
pnpm dev
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

`oa` 会以你执行命令时的目录作为工作目录，文件索引、读取、写入和命令执行都会限制在该目录下。模型配置默认读取用户全局配置文件：`~/.openagent/config.json`。

### 项目上下文

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

也可以用环境变量临时覆盖配置：

```bash
OPENAGENT_BASE_URL="https://api.example.com/v1" \
OPENAGENT_API_KEY="sk-..." \
OPENAGENT_MODEL="gpt-4.1" \
OPENAGENT_MAX_STEPS="5" \
oa
```

## 质量检查

```bash
pnpm lint
pnpm typecheck
pnpm format
```

## 项目结构

```
src/
├── index.tsx           # 入口
├── App.tsx             # 主组件（编排聊天流、命令处理、会话保存）
├── config/             # 配置管理（baseUrl、apiKey、model、maxSteps）
├── hooks/              # useChatStream / useFileIndex
├── commands/           # 斜杠命令（registry 模式，每个命令一个文件）
├── agent/
│   ├── provider.ts     # AI SDK provider 配置
│   ├── runAgent.ts     # 调用 AI SDK streamText 的核心逻辑
│   ├── skill/          # Skill 系统
│   └── tools/          # AI 工具（单文件单工具）
├── ui/                 # Ink UI 组件
│   ├── chat/           # 聊天交互（输入框、命令面板、确认对话框、文件选择器等）
│   ├── messages/       # 消息渲染（文本、工具调用、推理过程、文件内容）
│   ├── status/         # 状态栏（Header、StatusBar 等）
│   └── text/           # 文本 & 主题基础组件（Markdown、ThemedBox、Spinner 等）
└── utils/              # 工具函数（文件索引、@mention 解析、会话持久化等）
```

## 快捷键

- `Ctrl+O`：展开/折叠工具调用详情
- `Esc` / `Ctrl+C`：停止当前流式回复
- `↑/↓`：在命令面板或文件选择器中切换
- `Tab`：补全命令或选中文件

## 交互式确认

当 AI 需要执行写入文件等敏感操作时，输入区域会弹出黄色确认框，使用 ↑/↓ 选择后按 Enter 确认：

- **批准执行** — 允许该操作
- **拒绝** — 拒绝该操作

## 命令

- `/help`：查看所有可用命令
- `/status`：查看当前工作目录和文件索引状态
- `/config`：查看当前模型配置摘要（隐藏 API Key）
- `/tools`：列出 Agent 可调用的内置工具
- `/theme`：切换主题
- `/reload`：刷新 `@文件` 补全索引
- `/cancel`：停止当前正在流式生成的回复
- `/load [名称]`：恢复已保存会话
- `/sessions`：列出当前工作目录已保存的会话
- `/clear`：保存当前会话并开始新会话
- `/exit`：退出

> 每次 `/clear` 时自动保存当前会话到 `~/.openagent/sessions/{项目名}+{分支}/` 目录下，以 JSON 格式存储。

## 添加新命令

在 `src/commands/` 下新建一个文件：

```ts
import type { SlashCommand } from './registry';

export const fooCommand: SlashCommand = {
    name: '/foo',
    description: '示例命令',
    run: ({ appendItems, rawInput }) => {
        appendItems([
            { kind: 'user', text: rawInput },
            { kind: 'assistant', text: 'hello from /foo', streaming: false }
        ]);
    }
};
```

然后在 `src/commands/index.ts` 的 `COMMANDS` 数组里加入。

## 添加新工具

在 `src/agent/tools/` 下新建文件，导出 `tool({...})`，再到 `tools/index.ts` 注册。

## Channel 插件系统

OA 支持通过插件接入消息平台（微信、Telegram 等），实现远程与 AI 对话。

### 安装插件

```bash
# 在使用 OA 的项目目录下安装
pnpm add @oagent/weixin
```

### 启用插件

在 `~/.openagent/config.json` 中配置 `channels` 字段：

```json
{
    "baseUrl": "https://api.example.com/v1",
    "apiKey": "sk-...",
    "model": "gpt-4.1",
    "channels": ["@oagent/weixin"]
}
```

### 使用

```
/channel                  # 查看所有 channel 状态
/channel start weixin     # 启动微信机器人
/channel stop weixin      # 停止微信机器人
```

启动后，微信收到的消息会实时显示在 TUI 中，AI 的回复也会同步发送到微信。

### 开发自定义插件

创建一个 npm 包，导出 `register` 函数：

```typescript
import type { ChannelManager } from '@oagent/channels';

export function register(manager: ChannelManager, opts: { runAgent: RunAgentFn }): void {
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

## 技术文档

完整的技术文档请参阅 [docs/technical.md](docs/technical.md)，包含架构总览、数据流图、工具系统详解、安全机制等内容。
