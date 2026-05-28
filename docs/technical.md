# OpenAgent (oa) 技术文档

> 基于 Ink + AI SDK 的终端 AI Agent 客户端 (TUI)

---

## 目录

- [1. 项目概述](#1-项目概述)
- [2. 技术栈](#2-技术栈)
- [3. 项目结构](#3-项目结构)
- [4. 架构总览](#4-架构总览)
- [5. 启动流程](#5-启动流程)
- [6. 配置系统](#6-配置系统)
- [7. Agent 系统](#7-agent-系统)
- [8. 工具系统](#8-工具系统)
- [9. 命令系统](#9-命令系统)
- [10. Hook 系统](#10-hook-系统)
- [11. UI 组件体系](#11-ui-组件体系)
- [12. 主题系统](#12-主题系统)
- [13. 工具函数](#13-工具函数)
- [14. 数据流详解](#14-数据流详解)
- [15. 安全机制](#15-安全机制)
- [16. 构建与开发](#16-构建与开发)
- [17. 扩展指南](#17-扩展指南)

---

## 1. 项目概述

OpenAgent（简称 `oa`）是一个运行在终端中的 AI Agent 客户端，基于 **Ink**（React 渲染终端 UI）和 **AI SDK**（流式文本生成 + 工具调用）构建。用户可以在终端中输入文本与 AI 对话，AI 可以调用内置工具读取/写入文件、执行 Bash 命令、搜索网络等。

### 核心特性

- **流式对话**：实时显示 AI 生成的文本和推理过程
- **工具调用**：10 个内置工具，支持文件操作、命令执行、网络请求等
- **交互式审批**：写入类操作需要用户确认，防止意外修改
- **会话管理**：自动保存/加载对话历史，支持多会话切换
- **@ 文件引用**：输入 `@` 可引用项目文件，自动内联文件内容
- **斜杠命令**：11 个内置命令，支持补全和参数
- **主题系统**：4 套终端主题可切换
- **Skill 系统**：支持从 `~/.agents/skills/` 加载扩展技能

---

## 2. 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 运行时 | Node.js | >= 22 |
| 语言 | TypeScript | 5.x |
| UI 框架 | Ink 7 + React 19 | — |
| AI SDK | Vercel AI SDK (`ai`) | 最新 |
| Provider | `@ai-sdk/openai-compatible` | — |
| Markdown | `marked` | — |
| 包管理 | pnpm | >= 10.32.1 |
| 构建工具 | tsup (esbuild) | 8.x |
| 代码规范 | ESLint + Prettier | — |
| 提交规范 | commitlint + commitizen | — |
| Git Hooks | Husky + lint-staged | — |

---

## 3. 项目结构

```
OpenAgent/
├── src/
│   ├── index.tsx                    # 入口：Ink render(<App />)
│   ├── App.tsx                      # 根组件：编排全部子系统
│   ├── config/
│   │   └── index.ts                 # 配置管理（文件 + 环境变量）
│   ├── agent/
│   │   ├── index.ts                 # 重导出 runAgent
│   │   ├── provider.ts              # OpenAI 兼容 provider
│   │   ├── runAgent.ts              # 核心：streamText 调用
│   │   ├── skill/
│   │   │   └── index.ts             # Skill 工具加载
│   │   └── tools/                   # 10 个内置工具
│   │       ├── index.ts             # 工具注册表
│   │       ├── shared.ts            # 共享逻辑（writeFileContent）
│   │       ├── askUserQuestion.ts   # ask_user_question
│   │       ├── editFile.ts          # edit_file
│   │       ├── executeBash.ts       # execute_bash
│   │       ├── fetch.ts             # fetch
│   │       ├── glob.ts              # glob
│   │       ├── grep.ts              # grep
│   │       ├── readDirectory.ts     # read_directory
│   │       ├── readFile.ts          # read_file
│   │       ├── webSearch.ts         # web_search
│   │       └── writeFile.ts         # write_file
│   ├── commands/                    # 11 个斜杠命令
│   │   ├── registry.ts              # SlashCommand 接口 + CommandContext
│   │   ├── index.ts                 # 命令注册表 + 解析
│   │   ├── cancel.ts                # /cancel
│   │   ├── clear.ts                 # /clear
│   │   ├── config.ts                # /config
│   │   ├── exit.ts                  # /exit
│   │   ├── help.ts                  # /help
│   │   ├── load.ts                  # /load
│   │   ├── reload.ts                # /reload
│   │   ├── sessions.ts              # /sessions
│   │   ├── status.ts                # /status
│   │   ├── theme.ts                 # /theme
│   │   └── tools.ts                 # /tools
│   ├── hooks/
│   │   ├── useChatStream.ts         # 聊天状态机 + 流式逻辑
│   │   └── useFileIndex.ts          # 文件索引 (@mention 补全)
│   ├── ui/
│   │   ├── chat/                    # 聊天交互组件
│   │   │   ├── Input.tsx            # 主输入：模式切换调度器
│   │   │   ├── CommandInput.tsx     # 斜杠命令输入
│   │   │   ├── CommandPalette.tsx   # 命令补全面板
│   │   │   ├── ApprovalDialog.tsx   # 工具审批对话框
│   │   │   ├── FileMentionInput.tsx # @mention 文件补全
│   │   │   ├── FilePicker.tsx       # 文件选择器
│   │   │   ├── SessionPicker.tsx    # 会话选择器
│   │   │   └── ThemePicker.tsx      # 主题选择器
│   │   ├── messages/                # 消息渲染
│   │   │   ├── MessageList.tsx      # 消息列表容器
│   │   │   ├── PartRenderer.tsx     # 片段分发渲染
│   │   │   ├── TextPart.tsx         # 文本片段（Markdown）
│   │   │   ├── ToolCallPart.tsx     # 工具调用片段
│   │   │   ├── ReasoningPart.tsx    # 推理过程片段
│   │   │   ├── FilePart.tsx         # 文件片段
│   │   │   └── UserMessage.tsx      # 用户消息
│   │   ├── status/                  # 状态栏组件
│   │   │   ├── Header.tsx           # 顶部栏
│   │   │   ├── StatusBar.tsx        # 底部栏
│   │   │   ├── ProgressBar.tsx      # 进度条
│   │   │   ├── StatusIcon.tsx       # 状态图标
│   │   │   └── LoadingState.tsx     # 加载状态
│   │   └── text/                    # 基础组件 + 主题
│   │       ├── theme.tsx            # 主题定义 + Context
│   │       ├── ThemedBox.tsx        # 主题化 Box
│   │       ├── ThemedText.tsx       # 主题化 Text
│   │       ├── Markdown.tsx         # Markdown 渲染器
│   │       ├── MarkdownTable.tsx    # 表格渲染器
│   │       ├── Dialog.tsx           # 通用对话框
│   │       ├── Divider.tsx          # 分割线
│   │       ├── Spinner.tsx          # 加载动画
│   │       ├── Pane.tsx             # 面板容器
│   │       ├── Byline.tsx           # 标注行
│   │       ├── ListItem.tsx         # 可选中列表项
│   │       └── KeyboardShortcutHint.tsx
│   └── utils/                       # 工具函数
│       ├── files.ts                 # 文件索引 + @mention 解析
│       ├── highlight.ts             # 正则语法高亮
│       ├── markdown.ts              # Markdown 检测 + 词法分析
│       ├── safe-path.ts             # 路径安全沙箱
│       ├── sessions.ts              # 会话持久化
│       ├── summarize-args.ts        # 参数摘要
│       └── uid.ts                   # UUID 生成
├── tsconfig.json                    # TypeScript 配置
├── eslint.config.mjs                # ESLint 配置
├── commitlint.config.mjs            # 提交规范
├── config.example.json              # 配置模板
├── package.json                     # 包清单
└── pnpm-lock.yaml                   # 依赖锁文件
```

---

## 4. 架构总览

### 4.1 分层架构

```
┌─────────────────────────────────────────────────────┐
│                    Terminal (终端)                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│   ┌─────────────────────────────────────────────┐   │
│   │              Ink (React TUI)                │   │
│   │                                             │   │
│   │  ┌─────────┐  ┌──────────┐  ┌──────────┐  │   │
│   │  │  Input   │  │ Messages │  │  Status   │  │   │
│   │  │ Components│ │  Render  │  │   Bars    │  │   │
│   │  └────┬────┘  └────┬─────┘  └──────────┘  │   │
│   │       │             │                       │   │
│   │  ┌────┴─────────────┴───────────────────┐  │   │
│   │  │         useChatStream (Hook)          │  │   │
│   │  │  状态机: idle → streaming → awaiting   │  │   │
│   │  └────────────────┬─────────────────────┘  │   │
│   │                   │                         │   │
│   │  ┌────────────────┴─────────────────────┐  │   │
│   │  │            App.tsx (编排)             │  │   │
│   │  └──────────────────────────────────────┘  │   │
│   └─────────────────────────────────────────────┘   │
│                       │                             │
│   ┌───────────────────┴─────────────────────────┐   │
│   │               Agent Layer                    │   │
│   │                                             │   │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │   │
│   │  │ runAgent │  │ provider │  │  skill   │  │   │
│   │  │(streamText)│ │(OpenAI   │  │  loader  │  │   │
│   │  │          │  │ compat.) │  │          │  │   │
│   │  └────┬─────┘  └──────────┘  └──────────┘  │   │
│   │       │                                     │   │
│   │  ┌────┴─────────────────────────────────┐  │   │
│   │  │          Tools Registry              │  │   │
│   │  │  read  write  edit  bash  grep  ... │  │   │
│   │  └─────────────────────────────────────┘  │   │
│   └─────────────────────────────────────────────┘   │
│                       │                             │
│   ┌───────────────────┴─────────────────────────┐   │
│   │              External Services               │   │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │   │
│   │  │ AI API   │  │ Search   │  │ Filesystem│  │   │
│   │  │ (OpenAI  │  │ (DuckDdg │  │  (Node   │  │   │
│   │  │  compat) │  │  / API)  │  │   fs)    │  │   │
│   │  └──────────┘  └──────────┘  └──────────┘  │   │
│   └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 4.2 组件树

```
App
 └── ThemeProvider (主题上下文)
      └── AppContent
           ├── Header                  ← 顶部状态栏（应用名、模型、状态）
           ├── MessageList             ← 历史消息列表
           │    ├── UserMessage        ← 用户消息
           │    └── PartRenderer       ← AI 回复片段分发
           │         ├── TextPart      ← 文本（Markdown 渲染）
           │         ├── ReasoningPart ← 推理过程
           │         ├── ToolCallPart  ← 工具调用展示
           │         └── FilePart      ← 文件片段
           ├── [流式消息实时渲染]        ← 当前正在生成的回复
           ├── Input                   ← 主输入（模式切换调度器）
           │    ├── ApprovalDialog     ← 工具审批弹窗
           │    ├── SessionPicker      ← 会话选择弹窗
           │    ├── ThemePicker        ← 主题选择弹窗
           │    ├── CommandInput       ← 命令输入 + CommandPalette
           │    ├── FileMentionInput   ← @ 文件引用输入 + FilePicker
           │    └── TextInput          ← 普通文本输入
           └── StatusBar               ← 底部状态栏（cwd、分支、模型、token）
```

---

## 5. 启动流程

```
node dist/index.js (或 pnpm dev)
       │
       ▼
┌──────────────────┐
│  src/index.tsx   │  shebang: #!/usr/bin/env node
│  render(<App />) │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│    App.tsx       │  状态初始化
│                  │
│  1. process.cwd()│  ← 获取工作目录
│  2. ThemeProvider│  ← 默认主题 '5525'
│  3. AppContent   │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│              AppContent                   │
│                                          │
│  useFileIndex(cwd)                       │
│    ├── git ls-files → FileEntry[]        │
│    └── fallback: walkFs()                │
│                                          │
│  useChatStream({ fileIndex, cwd })       │
│    ├── messages: ModelMessage[]          │
│    ├── displayMessages: UIMessage[]      │
│    ├── status: 'idle'                    │
│    └── send(), approvePendingTool(), ... │
│                                          │
│  useInput(handleKeyboard)                │
│    ├── Ctrl+R → 切换 showReasoning       │
│    └── Ctrl+C / Esc → 取消当前响应       │
│                                          │
│  渲染: Header → Messages → Input → Status│
└──────────────────────────────────────────┘
```

---

## 6. 配置系统

### 6.1 配置来源与优先级

```
环境变量 (最高优先级)
   │
   ▼  合并（env 覆盖文件值）
配置文件 ~/.openagent/config.json
   │
   ▼  缺失值抛出异常
最终配置对象
```

### 6.2 配置项

| 配置项 | 环境变量 | 必填 | 默认值 | 说明 |
|--------|----------|------|--------|------|
| `baseUrl` | `OPENAGENT_BASE_URL` | 是 | — | OpenAI 兼容 API 的基础 URL |
| `apiKey` | `OPENAGENT_API_KEY` | 是 | — | API 密钥 |
| `model` | `OPENAGENT_MODEL` | 是 | — | 模型标识符 |
| `maxSteps` | `OPENAGENT_MAX_STEPS` | 否 | 20 | Agent 最大执行步数 (1-20) |

### 6.3 配置文件格式

```json
{
    "baseUrl": "https://api.example.com/v1",
    "apiKey": "sk-xxx",
    "model": "gpt-4o",
    "maxSteps": 20
}
```

### 6.4 导出函数

```typescript
getApiKey(): string           // 获取 API Key（必填，缺失抛异常）
getBaseUrl(): string          // 获取基础 URL（必填，缺失抛异常）
getModelName(): string        // 获取模型名（必填，缺失抛异常）
getMaxSteps(): number         // 获取最大步数（默认 20，范围 1-20）
getConfigSummary()            // 获取配置摘要（API Key 脱敏：前4位...后4位）
```

### 6.5 全局常量

- `APP_NAME = 'Open Agent'` — 应用名称
- `DEFAULT_MAX_STEPS = 20` — 默认最大步数
- `SKIP_DIRS` — 文件索引和 grep/glob 时跳过的目录：`node_modules`, `.git`, `dist`, `.next`, `.coverage`, `.cache`, `out`

---

## 7. Agent 系统

### 7.1 概述

Agent 系统是 OpenAgent 的核心，负责与 AI 模型交互。它基于 Vercel AI SDK 的 `streamText` 实现流式文本生成和工具调用。

### 7.2 Provider

使用 `@ai-sdk/openai-compatible` 创建兼容 OpenAI API 的 provider：

```typescript
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

export function getProvider() {
    return createOpenAICompatible({
        name: 'custom',
        apiKey: getApiKey(),
        baseURL: getBaseUrl()
    });
}
```

### 7.3 runAgent

```typescript
export async function runAgent(
    messages: ModelMessage[],
    abortSignal?: AbortSignal
): Promise<ReturnType<typeof streamText>>
```

核心调用逻辑：

```typescript
const result = streamText({
    model: getProvider()(getModelName()),
    stopWhen: stepCountIs(getMaxSteps()),
    tools: { skill, ...tools },
    abortSignal
});
```

- **model**: 通过 provider 和配置的模型名创建
- **stopWhen**: 最多执行 `maxSteps` 步
- **tools**: skill 工具 + 10 个内置工具
- **abortSignal**: 支持用户取消

### 7.4 Skill 系统

```typescript
import { createSkillTool } from 'bash-tool';

const getSkill = async () => {
    const { skill } = await createSkillTool({
        skillsDirectory: path.join(os.homedir(), '.agents', 'skills')
    });
    return { skill };
};
```

Skills 存放在 `~/.agents/skills/` 目录下，使用 `bash-tool` 包的 `experimental_createSkillTool` 加载。

---

## 8. 工具系统

### 8.1 工具注册表

所有工具在 `src/agent/tools/index.ts` 中注册：

```typescript
export const tools = {
    read_file: readFileTool,
    read_directory: readDirectoryTool,
    write_file: writeFileTool,
    edit_file: editFileTool,
    execute_bash: executeBashTool,
    grep: grepTool,
    glob: globTool,
    fetch: fetchTool,
    web_search: webSearchTool,
    ask_user_question: askUserQuestionTool
};
```

### 8.2 工具详细说明

#### read_file — 读取文件

| 属性 | 值 |
|------|-----|
| 参数 | `path: string`, `startLine?: number`, `endLine?: number` |
| 审批 | 无需 |
| 限制 | 最大文件大小 1MB |
| 返回 | `{ path, content, startLine, endLine, totalLines }` |

#### read_directory — 读取目录

| 属性 | 值 |
|------|-----|
| 参数 | `path: string` |
| 审批 | 无需 |
| 返回 | `{ path, entries: [{ name, isDirectory, isFile, path }] }` |

#### write_file — 写入文件

| 属性 | 值 |
|------|-----|
| 参数 | `path: string`, `content: string`, `overwrite?: boolean` |
| 审批 | **需要** |
| 返回 | `{ path, bytes, created, overwritten }` |

#### edit_file — 编辑文件

| 属性 | 值 |
|------|-----|
| 参数 | `path: string`, `old_string: string`, `new_string: string`, `replace_all?: boolean` |
| 审批 | **需要** |
| 验证 | `old_string` 必须存在且唯一（除非 `replace_all`） |
| 返回 | `{ path, replacements, totalLines }` |

#### execute_bash — 执行 Bash 命令

| 属性 | 值 |
|------|-----|
| 参数 | `command: string`, `timeout?: number` |
| 审批 | **动态判断**：只读命令无需审批，写入命令需要 |
| 限制 | 最大输出 1MB，默认超时 30s |
| 返回 | `{ command, exitCode, stdout, stderr, truncated }` |

**只读命令集** (`READONLY_COMMANDS`)：`ls`, `cat`, `grep`, `diff`, `find`（无 -exec）、`git`（只读子命令）、`npm list`、`node -v` 等 40+ 命令。

**危险命令模式** (`DANGEROUS_PATTERNS`)：

| 模式 | 说明 |
|------|------|
| `rm -rf /` | 递归删除根目录 |
| `mkfs.*` | 格式化磁盘 |
| `dd.*of=/dev/` | 直接写入设备 |
| `sudo` | 提权执行 |
| `su -` | 切换用户 |
| `shutdown` / `reboot` | 关机/重启 |
| `:(){ ... }` | Fork 炸弹 |
| `> /dev/sd` | 覆盖磁盘设备 |

#### grep — 搜索文件内容

| 属性 | 值 |
|------|-----|
| 参数 | `pattern`, `path`, `caseSensitive?`, `recursive?`, `glob?`, `context?`, `head_limit?`, `output_mode?` |
| 审批 | 无需 |
| 限制 | 最大 200 匹配，单文件最大 1MB |
| 支持 | 正则表达式、上下文行、glob 过滤、三种输出模式 |

#### glob — 文件匹配

| 属性 | 值 |
|------|-----|
| 参数 | `pattern: string`, `path?: string` |
| 审批 | 无需 |
| 限制 | 最大 200 匹配 |
| 支持 | `*`, `?`, `**` 通配符 |

#### fetch — HTTP 请求

| 属性 | 值 |
|------|-----|
| 参数 | `url`, `method?`, `headers?`, `body?`, `prompt?` |
| 审批 | 无需 |
| 安全 | SSRF 防护（阻止内网/本地地址） |
| 限制 | 最大响应 50KB |
| 特性 | `prompt` 参数支持关键词聚焦 |

#### web_search — 网络搜索

| 属性 | 值 |
|------|-----|
| 参数 | `query: string`, `max_results?: number` (最大 10，默认 5) |
| 审批 | 无需 |
| 后端 | (1) 配置 API (`OPENAGENT_SEARCH_API_URL`/`OPENAGENT_SEARCH_API_KEY`) <br> (2) DuckDuckGo HTML 抓取 |
| 返回 | `{ query, results: [{ title, url, snippet }], provider }` |

#### ask_user_question — 向用户提问

| 属性 | 值 |
|------|-----|
| 参数 | `question: string`, `options: string[]` (2-4 个), `header?: string` |
| 审批 | **需要** |
| 返回 | `{ question, options, header, status: 'awaiting_user_selection' }` |

### 8.3 工具审批流程

```
AI 模型决定调用工具
       │
       ▼
┌─────────────────────┐
│ needsApproval 检查   │
│                     │
│  read_file     → 否 │
│  read_directory→ 否 │
│  write_file    → 是 │
│  edit_file     → 是 │
│  execute_bash  → 动态│  (只读命令→否，写入命令→是)
│  grep/glob     → 否 │
│  fetch         → 否 │
│  web_search    → 否 │
│  ask_user_q.   → 是 │
└────────┬────────────┘
         │
    ┌────┴────┐
    │         │
   否         是
    │         │
    ▼         ▼
 直接执行   弹出 ApprovalDialog
              │
         ┌────┴────┐
         │         │
       批准       拒绝
         │         │
         ▼         ▼
     继续执行   跳过并返回拒绝原因
```

---

## 9. 命令系统

### 9.1 命令接口

```typescript
interface SlashCommand {
    name: string;                    // 如 '/help'
    description: string;             // 人类可读描述
    run: (ctx: CommandContext) => void | Promise<void>;
}
```

### 9.2 CommandContext

命令执行时接收的上下文对象，包含应用状态和回调：

```typescript
interface CommandContext {
    rawInput: string;                // 原始输入
    args: string[];                  // 解析后的参数
    cwd: string;                     // 当前工作目录
    fileIndexCount: number;          // 索引文件数
    messages: ModelMessage[];        // 当前对话消息
    displayMessages: UIMessage[];    // 当前 UI 消息
    pendingApproval: boolean;        // 是否有待审批
    appendMessages: (items) => void; // 追加消息
    setSession: (msgs, display) => void; // 设置会话
    resetSession: () => void;        // 重置会话
    saveCurrentSession: () => Promise<void>; // 保存会话
    cancelResponse: () => void;      // 取消响应
    reloadFileIndex: () => Promise<number>; // 重新加载文件索引
    exit: () => void;                // 退出
    listCommands: () => SlashCommand[]; // 列出命令
    showSessionPicker: (sessions) => void; // 显示会话选择器
    themeName: ThemeName;            // 当前主题名
    setThemeName: (name) => void;    // 设置主题
    showThemePicker: () => void;     // 显示主题选择器
}
```

### 9.3 命令解析流程

```
用户输入 "/help config"
       │
       ▼
parseCommandInput("/help config")
  → { name: "help", args: ["config"] }
       │
       ▼
findCommand("help")
  → helpCommand
       │
       ▼
helpCommand.run(ctx)
  → 输出命令帮助信息
```

### 9.4 全部命令

| 命令 | 说明 |
|------|------|
| `/help [命令名]` | 列出所有命令，或显示指定命令的帮助 |
| `/status` | 显示 cwd、文件索引数、消息数、审批状态 |
| `/config` | 显示配置摘要（API Key 脱敏） |
| `/theme [主题名]` | 打开主题选择器或直接设置主题 |
| `/tools` | 列出所有内置工具名 |
| `/reload` | 重新扫描工作目录，刷新文件索引 |
| `/cancel` | 停止当前流式响应 |
| `/load [会话名]` | 加载历史会话，或列出可用会话 |
| `/sessions` | 打开会话选择器 |
| `/clear` | 保存当前会话后重置 |
| `/exit` | 保存当前会话后退出 |

---

## 10. Hook 系统

### 10.1 useChatStream

核心聊天状态机，管理对话的完整生命周期。

#### 状态机

```
                  send()                工具调用需要审批
  ┌────────┐ ──────────→ ┌──────────┐ ──────────────→ ┌──────────────────┐
  │  idle  │             │streaming │                  │awaiting_approval │
  └────────┘ ←────────── └──────────┘ ←─────────────── └──────────────────┘
                 响应完成                    approvePendingTool()
                                           denyPendingTool()
                                           selectQuestionOption()
```

#### 导出接口

```typescript
interface UseChatStreamResult {
    messages: ModelMessage[];            // 模型对话历史
    displayMessages: UIMessage[];        // UI 展示消息
    status: ChatStatus;                  // 'idle' | 'streaming' | 'awaiting_approval'
    usage: UsageInfo | null;             // token 使用统计
    modelId: string;                     // 模型 ID
    pendingApproval: PendingToolApproval | null; // 待审批工具信息
    send: (text: string) => Promise<void>;        // 发送消息
    approvePendingTool: () => Promise<void>;      // 批准待审批工具
    denyPendingTool: (reason?) => Promise<void>;  // 拒绝待审批工具
    selectQuestionOption: (option) => Promise<void>; // 选择问题选项
    appendMessages: (items) => void;     // 追加消息
    setSession: (msgs, display) => void; // 设置会话
    reset: () => void;                   // 重置
    cancel: () => void;                  // 取消
}
```

#### 流式事件处理

AI SDK 的流包含 13 种事件类型：

| 事件 | 处理方式 |
|------|----------|
| `text-start` | 创建新的文本 part |
| `text-delta` | 追加文本增量 |
| `text-end` | 标记文本完成 |
| `reasoning-start` | 创建推理 part |
| `reasoning-delta` | 追加推理增量 |
| `reasoning-end` | 标记推理完成 |
| `tool-input-start` | 创建工具调用 part |
| `tool-input-delta` | 追加工具参数增量 |
| `tool-input-available` | 工具参数完整可用 |
| `tool-approval-request` | 设置 `awaiting_approval` 状态 |
| `tool-output-available` | 工具执行结果可用 |
| `tool-output-error` | 工具执行错误 |
| `tool-output-denied` | 工具调用被拒绝 |
| `file` | 文件附件 |
| `error` | 通用错误 |

#### send() 流程

```
send(text)
  │
  ├── 1. 展开 @mentions → expandMentions(text, fileIndex, cwd)
  ├── 2. 追加用户消息 + 空 AI 消息到 displayMessages
  ├── 3. 追加用户消息到 messages（过滤掉 system 消息）
  └── 4. streamMessages(messages)
           │
           ├── runAgent(messages, abortSignal)
           │    ├── getProvider()(getModelName())
           │    ├── getSkill()
           │    └── streamText({ model, tools, stopWhen })
           │
           ├── 遍历 toUIMessageStream() 事件
           │    └── 按事件类型更新 displayMessages
           │
           ├── await result.response → 合并到 messages
           └── await result.totalUsage → 更新 usage 统计
```

### 10.2 useFileIndex

```typescript
interface UseFileIndexResult {
    fileIndex: FileEntry[];    // 文件条目列表
    status: FileIndexStatus;   // 'indexing' | 'ready' | 'error'
    reload: () => Promise<number>; // 手动刷新
}
```

- 组件挂载时异步加载 `loadFileIndex(cwd)`
- 支持 `reload()` 手动刷新
- 通过 `cancelled` 标志实现安全取消

---

## 11. UI 组件体系

### 11.1 Input 组件（模式切换调度器）

Input 组件根据当前状态选择渲染哪个子组件，优先级从高到低：

```
优先级 1: pendingApproval 存在 → ApprovalDialog
优先级 2: sessionPicker 不为空 → SessionPicker
优先级 3: themePickerOpen → ThemePicker
优先级 4: disabled → 禁用输入
优先级 5: 输入以 '/' 开头且无空格 → CommandInput + CommandPalette
优先级 6: @mention 激活中 → FileMentionInput + FilePicker
优先级 7: 默认 → TextInput（普通文本输入）
```

### 11.2 MessageList

```typescript
interface MessageListProps {
    messages: UIMessage[];      // UI 消息列表
    showReasoning: boolean;     // 是否显示推理过程
}
```

- 使用 `React.memo` 优化渲染
- 遍历每条消息，用户消息渲染 `UserMessage`，AI 消息遍历 parts 渲染 `PartRenderer`

### 11.3 PartRenderer

按 `part.type` 分发到具体渲染器：

| part.type | 渲染组件 | 说明 |
|-----------|----------|------|
| `text` | `TextPart` → `Markdown` | 文本内容，支持 Markdown |
| `reasoning` | `ReasoningPart` → `Markdown` | 推理过程（暗色显示） |
| `dynamic-tool` | `ToolCallPart` | 工具调用及结果 |
| `file` / `source` / `source-url` | `FilePart` | 文件片段 |

### 11.4 ToolCallPart 状态图标

| 状态 | 图标 | 含义 |
|------|------|------|
| `input-streaming` | `⋯` | 正在接收参数 |
| `input-available` | `○` | 参数就绪 |
| `approval-requested` | `◔` | 等待用户审批 |
| `approval-responded` | `◉` | 已审批 |
| `output-available` | `●` | 结果可用 |
| `output-error` / `output-denied` | `▲` | 错误或被拒绝 |

### 11.5 Markdown 渲染

`Markdown.tsx` 支持的元素：

- 段落、标题 (h1-h6)
- 代码块（带语法高亮）
- 行内代码
- 有序/无序列表（支持嵌套）
- 引用块
- 水平分割线
- 表格（自适应终端宽度）
- 粗体、斜体、删除线、链接、图片

性能优化：快速路径检测 — `hasMarkdownSyntax()` 为 false 时直接渲染纯文本。

### 11.6 MarkdownTable

- 自动适应终端宽度
- 当行内容需要超过 4 行换行时，回退为垂直（key-value）布局
- 使用 ANSI 转义序列直接渲染（非逐单元格 React 组件），提高性能

---

## 12. 主题系统

### 12.1 主题定义

```typescript
interface Theme {
    accent: string;       // 强调色
    accentDim: string;    // 暗强调色
    suggestion: string;   // 建议色
    success: string;      // 成功色
    warning: string;      // 警告色
    error: string;        // 错误色
    inactive: string;     // 非活跃色
    subtle: string;       // 微妙色
    text: string;         // 文本色
    textDim: string;      // 暗文本色
    border: string;       // 边框色
    surface: string;      // 表面色
    syntax: SyntaxColors; // 语法高亮色
}

interface SyntaxColors {
    keyword: string;
    string: string;
    comment: string;
    function: string;
    number: string;
    type: string;
    operator: string;
    punctuation: string;
}
```

### 12.2 内置主题

| 主题 | 风格 |
|------|------|
| `dark` | VS Code 暗色风格 |
| `light` | VS Code 亮色风格 |
| `5525` | 五月天配色（蓝强调、绿成功、黄警告、红错误、粉建议）**默认主题** |
| `bubu` | 橙绿配色 |

### 12.3 主题使用

```typescript
// 提供主题上下文
<ThemeProvider>
    <AppContent />
</ThemeProvider>

// 在组件中使用
const { theme, themeName, setThemeName } = useTheme();

// ThemedText — 自动解析主题色名
<ThemedText color="accent">强调文字</ThemedText>

// ThemedBox — 自动解析边框和背景色
<ThemedBox borderColor="border" backgroundColor="surface">...</ThemedBox>
```

### 12.4 颜色解析

```typescript
resolveColor('accent', theme)    // → theme.accent (hex)
resolveColor('#ff0000', theme)   // → '#ff0000' (直接返回)
resolveColor(undefined, theme)   // → undefined
```

---

## 13. 工具函数

### 13.1 files.ts — 文件索引

```typescript
interface FileEntry {
    path: string;       // 相对于 cwd 的路径
    type: 'file' | 'dir';
}

// 加载文件索引：优先 git ls-files，回退 walkFs()
loadFileIndex(cwd: string): Promise<FileEntry[]>

// 模糊匹配文件：基于评分排序
filterFiles(index: FileEntry[], query: string, limit?: number): FileEntry[]

// 检测 @mention 激活
getActiveMention(value: string): { start: number; query: string } | null

// 展开 @mentions：替换为 <file path="...">content</file>
expandMentions(text: string, index: FileEntry[], cwd: string): Promise<string>
```

**模糊匹配评分规则**（从高到低）：

1. 精确词干匹配
2. 精确文件名匹配
3. 文件名以 query 开头
4. 词干以 query 开头

### 13.2 safe-path.ts — 路径安全

```typescript
const ROOT_DIR = path.resolve(process.cwd());

// 解析安全路径：阻止目录穿越和符号链接逃逸
resolveSafePath(relPath: string): string
```

- 检查路径是否在 ROOT_DIR 内
- 使用 `fs.realpathSync` 检测符号链接逃逸
- 拒绝包含 `..` 的路径穿越

### 13.3 sessions.ts — 会话持久化

```typescript
interface SavedSession {
    version: number;       // 版本号（当前 1）
    name: string;          // ISO 时间戳格式名
    cwd: string;           // 绝对路径
    branch: string;        // Git 分支或 'default'
    savedAt: string;       // ISO 时间戳
    messages: ModelMessage[];
    displayMessages: UIMessage[];
}
```

**存储路径**：`~/.openagent/sessions/{项目名}-{cwdHash}+{分支}/`

- 会话文件：`{name}.json`
- 索引文件：`index.json`（SessionSummary 数组）
- 支持从旧目录格式迁移

### 13.4 highlight.ts — 语法高亮

基于单一正则表达式的语法高亮器，支持：

- 注释：JS `//`、Python `#`、C `/* */`
- 字符串：单引号、双引号、反引号
- 数字
- 关键字：JS + Python
- 类型名：PascalCase
- 函数名：后跟 `(` 的标识符
- 标点和运算符

### 13.5 markdown.ts — Markdown 处理

```typescript
// 快速检测是否包含 Markdown 语法（检查前 500 字符）
hasMarkdownSyntax(text: string): boolean

// 使用 marked 词法分析器解析 Markdown
lexMarkdown(text: string): Token[]
```

### 13.6 summarize-args.ts — 参数摘要

将工具参数对象转换为 `key=value` 格式的摘要字符串，值超过 40 字符时截断。用于 UI 中工具调用的简洁展示。

### 13.7 uid.ts — 唯一 ID

```typescript
import { randomUUID } from 'node:crypto';
export const uid = randomUUID;
```

---

## 14. 数据流详解

### 14.1 用户输入 → AI 响应

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户输入                                 │
└───────────┬─────────────────────────────────────────────────────┘
            │
            ▼
    ┌───────────────┐     是      ┌────────────────────────┐
    │ 以 '/' 开头?   │ ──────────→ │ parseCommandInput()    │
    └───────┬───────┘             │ findCommand()          │
            │ 否                  │ cmd.run(ctx)           │
            ▼                     └────────────────────────┘
    ┌───────────────┐
    │ send(text)    │
    └───────┬───────┘
            │
            ▼
    ┌───────────────────────┐
    │ expandMentions(text)  │  @file → <file>content</file>
    └───────┬───────────────┘
            │
            ▼
    ┌───────────────────────┐
    │ 追加消息到              │
    │ messages[]            │  (ModelMessage)
    │ displayMessages[]     │  (UIMessage)
    └───────┬───────────────┘
            │
            ▼
    ┌───────────────────────┐
    │ streamMessages()      │
    └───────┬───────────────┘
            │
            ▼
    ┌───────────────────────┐
    │ runAgent(messages)    │
    │                       │
    │ streamText({          │
    │   model,              │
    │   tools,              │
    │   stopWhen,           │
    │   abortSignal         │
    │ })                    │
    └───────┬───────────────┘
            │
            ▼
    ┌───────────────────────────────────────────────┐
    │          遍历 toUIMessageStream() 事件          │
    │                                               │
    │  text-delta      → 更新 displayMessages 文本   │
    │  reasoning-delta → 更新推理过程                 │
    │  tool-*          → 更新工具调用状态             │
    │  tool-approval   → 设置 awaiting_approval      │
    │  error           → 显示错误                    │
    └───────┬───────────────────────────────────────┘
            │
            ▼
    ┌───────────────────────┐
    │ 响应完成               │
    │ 合并到 messages[]     │
    │ 更新 usage 统计       │
    │ status → 'idle'       │
    └───────────────────────┘
```

### 14.2 工具审批流程

```
AI 调用需要审批的工具
       │
       ▼
streamText 发出 'tool-approval-request' 事件
       │
       ▼
useChatStream:
  status = 'awaiting_approval'
  pendingApproval = { toolCallId, toolName, input }
       │
       ▼
Input.tsx 检测到 pendingApproval
  → 渲染 ApprovalDialog
       │
  ┌────┴────────────────┐
  │                     │
  ▼                     ▼
ask_user_question    其他工具
  → 显示问题+选项     → 显示 批准/拒绝
       │                     │
  ┌────┴────┐          ┌────┴────┐
  │         │          │         │
选择选项   Esc       批准      拒绝
  │         │          │         │
  ▼         ▼          ▼         ▼
selectQ.  denyP.   approveP.  denyP.
  │         │          │         │
  └────┬────┘          └────┬────┘
       │                    │
       ▼                    ▼
  发送 tool-result    发送 tool-approval-response
       │                    │
       ▼                    ▼
  继续 streamMessages() 继续 streamMessages()
```

### 14.3 会话持久化流程

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│  /clear  │    │  /exit   │    │ /sessions│
└────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │
     ▼               ▼               ▼
saveCurrentSession()  saveCurrentSession()  listSessions()
     │               │               │
     ▼               ▼               ▼
saveSession()    saveSession()   showSessionPicker()
     │               │               │
     ▼               ▼               ▼
写入 JSON 文件    写入 JSON 文件   用户选择会话
     │               │               │
     ▼               ▼               ▼
resetSession()   exit()        saveCurrentSession()
                                 │
                                 ▼
                              loadSession()
                                 │
                                 ▼
                              setSession()
```

### 14.4 @ 文件引用流程

```
用户输入 "请查看 @src/App"
       │
       ▼
Input.tsx 检测到 @mention 激活
  getActiveMention("请查看 @src/App")
  → { start: 4, query: "src/App" }
       │
       ▼
filterFiles(fileIndex, "src/App")
  → 返回匹配的文件列表（按评分排序）
       │
       ▼
FilePicker 显示匹配列表
       │
  ┌────┴────┐
  │         │
 Tab/Enter  继续输入
  │         │
  ▼         ▼
选择文件   更新匹配列表
替换为路径
       │
       ▼
用户提交 "请查看 @src/App.tsx"
       │
       ▼
expandMentions():
  "请查看 @src/App.tsx"
  → "请查看 <file path=\"src/App.tsx\">...文件内容...</file>"
       │
       ▼
发送给 AI 模型
```

### 14.5 双消息状态

系统维护两个并行的消息数组：

```
messages: ModelMessage[]          displayMessages: UIMessage[]
(AI SDK 对话历史)                  (UI 展示)
┌─────────────────┐              ┌─────────────────┐
│ system messages │              │                 │
├─────────────────┤              ├─────────────────┤
│ user message 1  │ ←── 同步 ──→ │ user message 1  │
├─────────────────┤              ├─────────────────┤
│ assistant resp 1│              │ assistant resp 1│
│ (含工具调用)     │              │ parts:          │
│                 │              │  - text         │
│                 │              │  - tool-call    │
│                 │              │  - tool-result  │
├─────────────────┤              ├─────────────────┤
│ tool result     │              │                 │
├─────────────────┤              ├─────────────────┤
│ assistant resp 2│ ←── 同步 ──→ │ user message 2  │
└─────────────────┘              └─────────────────┘

来源：AI 模型                  来源：UI 实时更新
用途：发送给模型              用途：渲染给用户
```

- `messages` 是 AI 的对话真相，发送给模型
- `displayMessages` 是 UI 的展示真相，实时渲染
- 用户输入同时写入两者
- AI 响应完成后合并到 `messages`，流式更新 `displayMessages`

---

## 15. 安全机制

### 15.1 路径安全

- **目录穿越防护**：`resolveSafePath()` 阻止 `..` 路径穿越
- **符号链接防护**：检查 `realpath` 是否仍在工作目录内
- **工作目录沙箱**：所有文件操作限制在 `process.cwd()` 内

### 15.2 命令执行安全

- **只读/写入分离**：`READONLY_COMMANDS` 集合区分安全命令
- **危险模式检测**：`DANGEROUS_PATTERNS` 阻止破坏性命令
- **动态审批**：写入类命令需要用户确认
- **超时限制**：默认 30 秒超时
- **输出限制**：最大 1MB 输出

### 15.3 网络安全

- **SSRF 防护**：`fetch` 工具阻止 localhost 和内网地址
  - 阻止 `127.0.0.0/8`、`10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16`
  - 阻止 `169.254.0.0/16`（链路本地）
  - 阻止 IPv6 私有地址
  - DNS 解析检查
- **响应大小限制**：最大 50KB

### 15.4 文件大小限制

- 读取文件：最大 1MB
- grep 匹配：最大 200 条，单文件最大 1MB
- glob 匹配：最大 200 条
- 文件索引：最大 5000 条目

### 15.5 配置安全

- API Key 在 `/config` 输出中脱敏显示（前 4 位 + `...` + 后 4 位）
- 配置文件存储在用户主目录 `~/.openagent/`，不提交到项目仓库

---

## 16. 构建与开发

### 16.1 开发命令

```bash
pnpm install          # 安装依赖
pnpm dev              # 开发模式（文件变更自动重启）
pnpm start            # 运行
pnpm build            # 编译到 dist/
pnpm lint             # ESLint 检查
pnpm lint:fix         # ESLint 自动修复
pnpm typecheck        # TypeScript 类型检查
pnpm test             # 运行测试
pnpm format           # Prettier 格式化
pnpm pack:dry         # 本地打包预检
pnpm publish:npm      # 发布到 npm
```

### 16.2 构建配置

```bash
tsup src/index.tsx \
  --format esm \
  --platform node \
  --target node22 \
  --splitting false \
  --clean \
  --out-dir dist
```

| 参数 | 值 | 说明 |
|------|-----|------|
| 格式 | ESM | ES Module 输出 |
| 平台 | Node | Node.js 运行时 |
| 目标 | Node 22 | 最低支持版本 |
| 代码拆分 | 关闭 | 单文件输出 |
| 输出目录 | dist/ | 编译产物目录 |

### 16.3 开发工具链

```
Git Commit
    │
    ▼
┌─────────────────────────────────┐
│         Husky Hooks             │
│                                 │
│  pre-commit → lint-staged       │
│    ├── ESLint --fix             │
│    └── Prettier --write         │
│                                 │
│  commit-msg → commitlint        │
│    └── 检查 conventional commit │
└─────────────────────────────────┘
```

### 16.4 TypeScript 配置

- Target: `ES2022`
- Module: `ESNext`
- Module Resolution: `bundler`
- JSX: `react-jsx`
- 路径别名: `@/*` → `./src/*`

---

## 17. 扩展指南

### 17.1 添加新命令

1. 在 `src/commands/` 下创建新文件
2. 实现 `SlashCommand` 接口：

```typescript
import { SlashCommand } from './registry';

const myCommand: SlashCommand = {
    name: '/mycommand',
    description: '命令描述',
    run: (ctx) => {
        // ctx 包含应用状态和回调
        ctx.appendMessages([{
            id: uid(),
            role: 'assistant',
            parts: [{ type: 'text', text: '命令执行结果' }]
        }]);
    }
};

export default myCommand;
```

3. 在 `src/commands/index.ts` 的 `COMMANDS` 数组中注册

### 17.2 添加新工具

1. 在 `src/agent/tools/` 下创建新文件
2. 使用 AI SDK 的 `tool({...})` 定义：

```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const myTool = tool({
    description: '工具描述',
    parameters: z.object({
        param1: z.string().describe('参数描述'),
        param2: z.number().optional()
    }),
    needsApproval: false,  // 或 (params) => boolean
    execute: async ({ param1, param2 }) => {
        // 工具逻辑
        return { result: 'success' };
    }
});
```

3. 在 `src/agent/tools/index.ts` 的 `tools` 对象中注册

### 17.3 添加新主题

在 `src/ui/text/theme.tsx` 的 `themes` 对象中添加新主题定义：

```typescript
export const themes: Record<ThemeName, Theme> = {
    // ... 现有主题
    mytheme: {
        accent: '#ff6600',
        accentDim: '#cc5200',
        // ... 其他颜色
        syntax: { /* ... */ }
    }
};
```

然后更新 `ThemeName` 类型：

```typescript
export type ThemeName = 'dark' | 'light' | '5525' | 'bubu' | 'mytheme';
```
