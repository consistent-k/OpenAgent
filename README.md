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

## 快速开始（安装版）

```bash
# 全局安装
pnpm add -g @oagent/oa
# 或
npm install -g @oagent/oa

# 在项目目录中启动（首次运行会自动进入配置向导）
cd /path/to/your/project
oa
```

也可以使用环境变量临时覆盖配置（跳过配置向导）：

```bash
OPENAGENT_BASE_URL="https://api.example.com/v1" \
OPENAGENT_API_KEY="sk-..." \
OPENAGENT_MODEL="gpt-4.1" \
oa
```

> `oa` 会以当前目录为工作目录，文件读写、命令执行等操作都会限制在该目录下。首次运行或配置缺失时会自动打开配置向导，引导你填入 `baseUrl`、`apiKey`、`model` 等参数，保存到 `~/.openagent/config.json`。

## 开发

参见 [docs/development.md](docs/development.md)，包含开发环境搭建、编译、项目结构、扩展指南等内容。

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
- `/config`：打开配置选择器，编辑配置文件
- `/approvals`：管理工具审批偏好（execute_bash/write_file/edit_file）
- `/tools`：列出 Agent 可调用的内置工具
- `/theme`：切换主题
- `/channel`：管理消息渠道（start/stop/login/logout/status）
- `/reload`：刷新 `@文件` 补全索引
- `/cancel`：停止当前正在流式生成的回复
- `/sessions`：列出并恢复已保存会话
- `/clear`：保存当前会话并开始新会话
- `/exit`：保存会话、停止所有渠道、退出

> 每次 `/clear` 时自动保存当前会话到 `~/.openagent/sessions/<sessionId>.json`，历史记录追加到 `~/.openagent/history.jsonl`。

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

> 开发自定义插件请参阅 [docs/development.md](docs/development.md)。

## 技术文档

完整的技术文档请参阅 [docs/technical.md](docs/technical.md)，包含架构总览、数据流图、工具系统详解、安全机制等内容。
