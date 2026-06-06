# 项目结构

> 本文件是项目结构的唯一维护点。CLAUDE.md 和 docs/technical.md 通过链接引用此文件。

```
OpenAgent/
├── packages/                          # monorepo 子包（pnpm workspaces）
│   ├── core/                          # @oagent/core — 主应用
│   │   ├── src/
│   │   │   ├── index.tsx              # 入口：Ink render(<App />)
│   │   │   ├── cli.ts                 # CLI 入口（shebang）
│   │   │   ├── App.tsx                # 根组件：编排聊天流、命令处理、会话保存
│   │   │   ├── config/
│   │   │   │   └── index.ts           # 配置管理（多供应商 providers、activeModel、maxSteps、channels、locale 等）
│   │   │   ├── hooks/
│   │   │   │   ├── useChatStream.ts   # 核心聊天流：调用 AI SDK streamText，处理工具调用、分段更新
│   │   │   │   ├── useFileIndex.ts    # 文件索引：@mention 补全用的文件列表
│   │   │   │   └── useLocaleSetup.ts  # 语言初始化：启动时加载语言扩展包并设置当前语言
│   │   │   ├── commands/              # 斜杠命令（registry 模式）
│   │   │   │   ├── registry.ts        # SlashCommand 接口 + CommandContext 定义
│   │   │   │   ├── index.ts           # COMMANDS 数组，所有命令在此注册
│   │   │   │   ├── approvals.ts       # /approvals — 管理工具审批偏好
│   │   │   │   ├── cancel.ts          # /cancel — 取消当前任务
│   │   │   │   ├── channel.ts         # /channel — 管理消息渠道（动态加载插件）
│   │   │   │   ├── clear.ts           # /clear — 清空对话（自动保存会话）
│   │   │   │   ├── config.ts          # /config — 打开配置选择器
│   │   │   │   ├── exit.ts            # /exit — 退出程序
│   │   │   │   ├── help.ts            # /help — 列出可用命令
│   │   │   │   ├── locale.ts          # /locale — 查看/切换语言
│   │   │   │   ├── reload.ts          # /reload — 重新加载配置
│   │   │   │   ├── sessions.ts        # /sessions — 列出并恢复已保存会话
│   │   │   │   ├── status.ts          # /status — 显示连接状态
│   │   │   │   ├── theme.ts           # /theme — 切换主题
│   │   │   │   ├── tools.ts           # /tools — 列出可用工具
│   │   │   │   └── update.ts          # /update — 检查并更新 oa 到最新版本
│   │   │   ├── engine/                # AI 引擎（agents、tools、skill、config、middleware）
│   │   │   │   ├── index.ts           # 公共 API：导出 runAgent、getProvider、getSystemPrompt
│   │   │   │   ├── agents/
│   │   │   │   │   └── index.ts       # runAgent() 核心 AI 循环
│   │   │   │   ├── config/
│   │   │   │   │   ├── provider.ts    # AI SDK provider 配置（OpenAI-compatible）
│   │   │   │   │   └── system-prompt.ts # 系统提示词动态生成（读取 AGENTS.md）
│   │   │   │   ├── middleware/
│   │   │   │   │   └── retry-notification.ts # 429 限流重试通知中间件
│   │   │   │   ├── skill/
│   │   │   │   │   └── index.ts       # Skill 系统入口
│   │   │   │   └── tools/             # AI 工具（每个工具一个文件夹，导出 tool({...})）
│   │   │   │       ├── index.ts       # 工具注册表
│   │   │   │       ├── utils/         # 工具共享逻辑
│   │   │   │       │   ├── approval-store.ts  # 工具审批偏好持久化
│   │   │   │       │   └── write-file.ts      # 文件写入共享函数
│   │   │   │       ├── askUserQuestion/
│   │   │   │       │   └── index.ts
│   │   │   │       ├── bash/
│   │   │   │       │   └── index.ts
│   │   │   │       ├── date/
│   │   │   │       │   └── index.ts   # 获取当前日期时间信息
│   │   │   │       ├── editFile/
│   │   │   │       │   └── index.ts
│   │   │   │       ├── fetch/
│   │   │   │       │   └── index.ts
│   │   │   │       ├── glob/
│   │   │   │       │   └── index.ts
│   │   │   │       ├── grep/
│   │   │   │       │   └── index.ts
│   │   │   │       ├── readDirectory/
│   │   │   │       │   └── index.ts
│   │   │   │       ├── readFile/
│   │   │   │       │   └── index.ts
│   │   │   │       ├── webSearch/
│   │   │   │       │   └── index.ts
│   │   │   │       └── writeFile/
│   │   │   │           └── index.ts
│   │   │   ├── channels/
│   │   │   │   └── index.ts           # 重导出 @oagent/channels
│   │   │   ├── ui/                    # Ink UI 组件
│   │   │   │   ├── index.ts
│   │   │   │   ├── chat/              # 聊天交互组件
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── Input.tsx          # 主输入框
│   │   │   │   │   ├── CommandInput.tsx   # 命令输入模式
│   │   │   │   │   ├── CommandPalette.tsx # 命令面板（斜杠命令补全）
│   │   │   │   │   ├── ApprovalDialog.tsx # 工具调用确认对话框
│   │   │   │   │   ├── FileMentionInput.tsx # @mention 文件补全
│   │   │   │   │   ├── FilePicker.tsx     # 文件选择器
│   │   │   │   │   ├── ModelPicker.tsx    # 模型管理选择器
│   │   │   │   │   ├── ProviderPicker.tsx # 供应商管理选择器
│   │   │   │   │   ├── SessionPicker.tsx  # 会话选择器
│   │   │   │   │   ├── ThemePicker.tsx    # 主题选择器
│   │   │   │   │   ├── ConfigPicker.tsx   # 配置编辑器
│   │   │   │   │   ├── ThemedInput.tsx    # 主题化输入框
│   │   │   │   │   ├── OverlaySlot.tsx    # 浮层容器
│   │   │   │   │   ├── overlays/
│   │   │   │   │   │   └── index.ts       # 浮层组件导出
│   │   │   │   │   └── useInputMode.ts    # 输入模式 hook
│   │   │   │   ├── messages/          # 消息渲染
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── MessageList.tsx    # 消息列表容器
│   │   │   │   │   ├── PartRenderer.tsx   # 消息片段分发渲染
│   │   │   │   │   ├── TextPart.tsx       # 文本片段
│   │   │   │   │   ├── ToolCallPart.tsx   # 工具调用片段
│   │   │   │   │   ├── ToolCallGroup.tsx  # 工具调用分组
│   │   │   │   │   ├── groupToolParts.ts  # 工具分组逻辑
│   │   │   │   │   ├── ReasoningPart.tsx  # 推理过程片段
│   │   │   │   │   ├── FilePart.tsx       # 文件内容片段
│   │   │   │   │   └── UserMessage.tsx    # 用户消息
│   │   │   │   ├── status/            # 状态栏组件
│   │   │   │   │   ├── index.ts
│   │   │   │   │   ├── Header.tsx         # 顶部状态栏
│   │   │   │   │   ├── StatusBar.tsx      # 底部状态栏
│   │   │   │   │   ├── StatusIcon.tsx     # 状态图标
│   │   │   │   │   └── Tips.tsx           # 重试通知提示
│   │   │   │   └── text/              # 文本 & 主题基础组件
│   │   │   │       ├── index.ts
│   │   │   │       ├── theme.tsx          # 主题系统定义
│   │   │   │       ├── ThemedBox.tsx      # 主题化容器
│   │   │   │       ├── ThemedText.tsx     # 主题化文本
│   │   │   │       ├── Markdown.tsx       # Markdown 渲染
│   │   │   │       ├── MarkdownTable.tsx  # Markdown 表格
│   │   │   │       ├── Dialog.tsx         # 对话框
│   │   │   │       ├── Divider.tsx        # 分割线
│   │   │   │       ├── Spinner.tsx        # 加载动画
│   │   │   │       ├── Pane.tsx           # 面板容器
│   │   │   │       ├── Byline.tsx         # 标注行
│   │   │   │       ├── ListItem.tsx       # 列表项
│   │   │   │       └── KeyboardShortcutHint.tsx # 键盘快捷键提示
│   │   │   └── utils/
│   │   │       ├── errors.ts          # 错误信息提取
│   │   │       ├── exec.ts            # promisified execFile
│   │   │       ├── files.ts           # 文件索引 / @mention 解析
│   │   │       ├── fs.ts              # 文件系统工具（ensureDirSync、readJsonFile 等）
│   │   │       ├── highlight.ts       # 代码语法高亮
│   │   │       ├── markdown.ts        # Markdown 渲染工具
│   │   │       ├── safe-path.ts       # 安全路径处理
│   │   │       ├── sessions.ts        # 会话持久化（JSON 格式存储到 ~/.openagent/sessions/）
│   │   │       ├── summarize-args.ts  # 工具参数摘要（用于 UI 展示）
│   │   │       ├── uid.ts             # 唯一 ID 生成
│   │   │       ├── update.ts          # 自更新逻辑（检测包管理器、比对版本、执行更新）
│   │   │       └── walk.ts            # 目录遍历
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   ├── channels/                      # @oagent/channels — Channel SDK
│   │   ├── src/
│   │   │   ├── types.ts               # Channel 接口定义
│   │   │   ├── manager.ts             # ChannelManager 单例
│   │   │   ├── session.ts             # SessionManager 会话管理
│   │   │   └── index.ts               # 入口
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   ├── i18n/                          # @oagent/i18n — 国际化 SDK
│   │   ├── src/
│   │   │   ├── index.ts               # 入口，注册内置语言（zh、en）
│   │   │   ├── engine.ts              # 翻译引擎（t、getLocale、setLocale、registerLocale）
│   │   │   └── locales/
│   │   │       ├── zh.ts              # 中文语言包
│   │   │       └── en.ts              # 英文语言包
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   ├── weixin/                        # @oagent/weixin — 微信插件
│   │   ├── src/
│   │   │   ├── index.ts               # register() 插件入口
│   │   │   ├── channel.ts             # WeixinChannel 实现
│   │   │   ├── api/                   # 微信 API 客户端与端点
│   │   │   │   ├── client.ts
│   │   │   │   ├── endpoints.ts
│   │   │   │   └── index.ts
│   │   │   ├── auth/                  # 登录与账号管理
│   │   │   │   ├── accounts.ts
│   │   │   │   ├── login.ts
│   │   │   │   └── index.ts
│   │   │   ├── messaging/             # 消息收发与处理
│   │   │   │   ├── adapter.ts
│   │   │   │   ├── markdown-filter.ts
│   │   │   │   ├── process.ts
│   │   │   │   ├── send.ts
│   │   │   │   └── index.ts
│   │   │   ├── monitor/               # 消息监控（runAgent 依赖注入）
│   │   │   │   ├── main.ts
│   │   │   │   └── index.ts
│   │   │   ├── storage/               # 会话存储与同步
│   │   │   │   ├── context-token.ts
│   │   │   │   ├── sync-buf.ts
│   │   │   │   └── index.ts
│   │   │   ├── types/                 # 类型定义
│   │   │   │   ├── protocol.ts
│   │   │   │   ├── plugin.ts
│   │   │   │   ├── vendor.d.ts
│   │   │   │   └── index.ts
│   │   │   └── utils/                 # 工具函数
│   │   │       ├── logger.ts
│   │   │       ├── random.ts
│   │   │       ├── redact.ts
│   │   │       └── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsup.config.ts
│   └── telegram/                      # @oagent/telegram — Telegram 插件
│       ├── src/
│       │   ├── index.ts               # register() 插件入口
│       │   ├── channel.ts             # TelegramChannel 实现
│       │   ├── api/                   # Telegram Bot API 客户端
│       │   │   ├── client.ts
│       │   │   └── index.ts
│       │   ├── messaging/             # 消息收发与处理
│       │   │   ├── process.ts
│       │   │   └── index.ts
│       │   ├── monitor/               # 消息监控
│       │   │   ├── main.ts
│       │   │   └── index.ts
│       │   ├── storage/               # 账号存储
│       │   │   ├── accounts.ts
│       │   │   └── index.ts
│       │   ├── types/                 # 类型定义
│       │   │   ├── plugin.ts
│       │   │   └── index.ts
│       │   └── utils/                 # 工具函数
│       │       ├── logger.ts
│       │       ├── redact.ts
│       │       └── index.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── tsup.config.ts
├── scripts/
│   ├── version.sh                     # 统一版本号管理
│   └── publish.sh                     # 统一发布脚本
├── docs/
│   ├── development.md                 # 开发指南
│   ├── technical.md                   # 技术文档
│   └── project-structure.md           # 本文件
├── config.example.json                # 配置模板
├── tsconfig.json                      # TypeScript 配置（路径别名）
├── tsup.config.ts                     # 根包构建配置
├── eslint.config.mjs                  # ESLint 配置
├── commitlint.config.mjs              # 提交规范
├── pnpm-workspace.yaml                # pnpm 工作区定义
├── package.json                       # 根包清单
└── pnpm-lock.yaml                     # 依赖锁文件
```
