# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**oa** 是一个基于 Ink + AI SDK 的终端 AI Agent 客户端（TUI）。用户可以在终端中输入文本与 AI 对话，AI 可以调用工具读取/写入文件、执行 Bash 命令等。

## 开发命令

```bash
# 安装依赖
pnpm install

# 开发模式（文件变更自动重启）
pnpm dev

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
pnpm pack:dry      # 本地打包预检
pnpm publish:npm   # 发布到 npm
```

配置模型：`cp config.example.json ~/.openagent/config.json`，然后编辑填入 `baseUrl`、`apiKey`、`model`。也可以用环境变量 `OPENAGENT_BASE_URL`、`OPENAGENT_API_KEY`、`OPENAGENT_MODEL` 临时覆盖。

## 架构概览

```
src/
├── index.tsx              # 入口，调用 Ink render(<App />)
├── App.tsx                # 主组件：编排聊天流、命令处理、会话保存
├── config/
│   └── index.ts           # 配置管理（baseUrl、apiKey、model、maxSteps 等）
├── hooks/
│   ├── useChatStream.ts   # 核心聊天流：调用 AI SDK streamText，处理工具调用、分段更新
│   └── useFileIndex.ts    # 文件索引：@mention 补全用的文件列表
├── commands/              # 斜杠命令（registry 模式）
│   ├── registry.ts        # SlashCommand 接口 + CommandContext 定义
│   ├── index.ts           # COMMANDS 数组，所有命令在此注册
│   ├── cancel.ts          # /cancel — 取消当前任务
│   ├── clear.ts           # /clear — 清空对话（自动保存会话）
│   ├── config.ts          # /config — 显示当前配置
│   ├── exit.ts            # /exit — 退出程序
│   ├── help.ts            # /help — 列出可用命令
│   ├── load.ts            # /load — 加载历史会话
│   ├── reload.ts          # /reload — 重新加载配置
│   ├── sessions.ts        # /sessions — 管理会话列表
│   ├── status.ts          # /status — 显示连接状态
│   ├── theme.ts           # /theme — 切换主题
│   └── tools.ts           # /tools — 列出可用工具
├── agent/
│   ├── index.ts           # 重新导出 runAgent
│   ├── provider.ts        # AI SDK provider 配置（OpenAI-compatible）
│   ├── runAgent.ts        # 调用 AI SDK streamText 的核心逻辑
│   ├── skill/
│   │   └── index.ts       # Skill 系统入口
│   └── tools/             # AI 工具（每个文件导出一个 tool({...})）
│       ├── index.ts       # 工具注册表
│       ├── shared.ts      # 工具共享逻辑
│       ├── askUserQuestion.ts
│       ├── editFile.ts
│       ├── executeBash.ts
│       ├── fetch.ts
│       ├── glob.ts
│       ├── grep.ts
│       ├── readDirectory.ts
│       ├── readFile.ts
│       ├── webSearch.ts
│       └── writeFile.ts
├── ui/                    # Ink UI 组件
│   ├── index.ts
│   ├── chat/              # 聊天交互组件
│   │   ├── index.ts
│   │   ├── Input.tsx          # 主输入框
│   │   ├── CommandInput.tsx   # 命令输入模式
│   │   ├── CommandPalette.tsx # 命令面板（斜杠命令补全）
│   │   ├── ApprovalDialog.tsx # 工具调用确认对话框
│   │   ├── FileMentionInput.tsx # @mention 文件补全
│   │   ├── FilePicker.tsx     # 文件选择器
│   │   ├── SessionPicker.tsx  # 会话选择器
│   │   └── ThemePicker.tsx    # 主题选择器
│   ├── messages/          # 消息渲染
│   │   ├── index.ts
│   │   ├── MessageList.tsx    # 消息列表容器
│   │   ├── PartRenderer.tsx   # 消息片段分发渲染
│   │   ├── TextPart.tsx       # 文本片段
│   │   ├── ToolCallPart.tsx   # 工具调用片段
│   │   ├── ReasoningPart.tsx  # 推理过程片段
│   │   ├── FilePart.tsx       # 文件内容片段
│   │   └── UserMessage.tsx    # 用户消息
│   ├── status/            # 状态栏组件
│   │   ├── index.ts
│   │   ├── Header.tsx         # 顶部状态栏
│   │   ├── StatusBar.tsx      # 底部状态栏
│   │   ├── ProgressBar.tsx    # 进度条
│   │   ├── StatusIcon.tsx     # 状态图标
│   │   └── LoadingState.tsx   # 加载状态
│   └── text/              # 文本 & 主题基础组件
│       ├── index.ts
│       ├── theme.tsx          # 主题系统定义
│       ├── ThemedBox.tsx      # 主题化容器
│       ├── ThemedText.tsx     # 主题化文本
│       ├── Markdown.tsx       # Markdown 渲染
│       ├── MarkdownTable.tsx  # Markdown 表格
│       ├── Dialog.tsx         # 对话框
│       ├── Divider.tsx        # 分割线
│       ├── Spinner.tsx        # 加载动画
│       ├── Pane.tsx           # 面板容器
│       ├── Byline.tsx         # 标注行
│       ├── ListItem.tsx       # 列表项
│       ├── KeyboardShortcutHint.tsx # 键盘快捷键提示
│       ├── useInverseColor.ts # 反色 hook
│       └── useSyntaxColor.ts  # 语法高亮色 hook
└── utils/
    ├── files.ts           # 文件索引 / @mention 解析
    ├── markdown.ts        # Markdown 渲染工具
    ├── highlight.ts       # 代码语法高亮
    ├── safe-path.ts       # 安全路径处理
    ├── sessions.ts        # 会话持久化（JSON 格式存储到 ~/.openagent/sessions/）
    ├── summarize-args.ts  # 工具参数摘要（用于 UI 展示）
    └── uid.ts             # 唯一 ID 生成
```

### 核心数据流

1. `App.tsx` 中的 `useChatStream` hook 负责调用 `runAgent`，后者使用 AI SDK 的 `streamText` 与模型交互。
2. 用户输入以 `/` 开头时，通过 `commands/registry.ts` 的 `findCommand` 匹配并执行；否则作为普通消息 `send()` 到 AI。
3. 工具调用结果通过 `pendingApproval` 状态触发 `Input` 组件中的交互式确认框（批准/拒绝）。
4. 会话自动保存：`/clear` 时保存到 `~/.openagent/sessions/{项目名}+{分支}/`。

## 添加新命令

在 `src/commands/` 下新建文件，实现 `SlashCommand` 接口，然后在 `src/commands/index.ts` 的 `COMMANDS` 数组中注册。

## 添加新工具

在 `src/agent/tools/` 下新建文件，导出 `tool({...})`，然后在 `src/agent/tools/index.ts` 的 `tools` 对象中注册。

## 关键技术栈

- **Ink 7** — TUI 渲染框架
- **AI SDK (`ai`)** — 流式文本生成 + 工具调用
- **React 19** — UI 组件
- **TypeScript** — 路径别名 `@/*` 映射到 `./src/*`
- **tsup** — 构建工具，ESM 格式输出，target Node 22
- **tsx** — TypeScript 运行时
- 要求 Node >= 22，pnpm >= 10.32.1
