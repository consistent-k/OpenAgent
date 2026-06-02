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

```
packages/
├── core/               # @oagent/core — 主应用
│   └── src/
│       ├── index.tsx           # 入口
│       ├── App.tsx             # 主组件（编排聊天流、命令处理、会话保存）
│       ├── config/             # 配置管理（baseUrl、apiKey、model、maxSteps、channels）
│       ├── hooks/              # useChatStream / useFileIndex
│       ├── commands/           # 斜杠命令（registry 模式，每个命令一个文件）
│       ├── engine/              # AI 引擎（agents、tools、skill、config）
│       │   ├── index.ts        # 公共 API：导出 runAgent、getProvider、getSystemPrompt
│       │   ├── agents/
│       │   │   └── index.ts    # runAgent() 核心 AI 循环
│       │   ├── config/
│       │   │   ├── provider.ts     # AI SDK provider 配置
│       │   │   └── system-prompt.ts # 系统提示词动态生成
│       │   ├── skill/          # Skill 系统（experimental_createSkillTool）
│       │   └── tools/          # AI 工具（每个工具一个文件夹）
│       │       ├── index.ts    # 工具注册表
│       │       └── utils/      # approval-store.ts, write-file.ts
│       ├── ui/                 # Ink UI 组件
│       │   ├── chat/           # 聊天交互（Input、ApprovalDialog、ConfigPicker、OverlaySlot 等）
│       │   ├── messages/       # 消息渲染（TextPart、ToolCallPart、ToolCallGroup、FilePart 等）
│       │   ├── status/         # 状态栏（Header、StatusBar、StatusIcon）
│       │   └── text/           # 文本 & 主题基础组件（Markdown、MarkdownTable、ThemedBox 等）
│       └── utils/              # 工具函数（files、sessions、safe-path、walk、fs、highlight 等）
├── channels/           # @oagent/channels — Channel SDK
│   └── src/
│       ├── index.ts            # 入口（导出 Channel、ChannelManager、SessionManager）
│       ├── types.ts            # Channel 接口定义
│       ├── manager.ts          # ChannelManager 单例
│       └── session.ts          # SessionManager 会话管理
└── weixin/             # @oagent/weixin — 微信插件
    └── src/
        ├── index.ts            # register() 插件入口
        ├── channel.ts          # WeixinChannel 实现
        ├── auth/               # 账号凭证管理 + 扫码登录
        ├── api/                # iLink 协议 HTTP 客户端 + 端点函数
        ├── messaging/          # 消息适配、发送、Markdown 过滤
        ├── monitor/            # 消息监控主循环（长轮询）
        ├── storage/            # 上下文 token 和 sync-buf 游标持久化
        ├── types/              # iLink 协议类型 + 插件接口类型
        └── utils/              # 日志、ID 生成、日志脱敏
```

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
