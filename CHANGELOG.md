# Changelog

本文档记录 OpenAgent 的所有重要变更。

## [1.1.2](https://github.com/consistent-k/OpenAgent/compare/v1.1.1...v1.1.2) (2026-06-10)

### ✨ 新功能

- 统一子代理工具与流式执行重构 ([95b7131](https://github.com/consistent-k/OpenAgent/commit/95b7131))
- active model 改为列表选择替代手动输入 ([f7294d1](https://github.com/consistent-k/OpenAgent/commit/f7294d1))
- 子代理运行过程实时展示与 ESC 硬终止支持 ([b82a998](https://github.com/consistent-k/OpenAgent/commit/b82a998))

### 🐛 Bug 修复

- 修复 version.sh 中 node -p 的 return 语句错误 ([50913d1](https://github.com/consistent-k/OpenAgent/commit/50913d1))
- 修复 release-please tag 格式，移除 oa component 前缀 ([95c3436](https://github.com/consistent-k/OpenAgent/commit/95c3436))

### ♻️ 重构

- 迁移版本管理至自定义脚本，新增 changelog-collect 技能 ([691d551](https://github.com/consistent-k/OpenAgent/commit/691d551))

## [1.1.1](https://github.com/consistent-k/OpenAgent/compare/v1.1.0...v1.1.1) (2026-06-08)

### 🐛 Bug 修复

* 修复 useInput 与 Dialog 的 Enter 键冲突导致命令重复执行 ([c8b6387](https://github.com/consistent-k/OpenAgent/commit/c8b6387))

## [1.1.0](https://github.com/consistent-k/OpenAgent/compare/v1.0.5...v1.1.0) (2026-06-08)

### ✨ 新功能

* 迁移 standard-version 到 release-please ([8d01c4e](https://github.com/consistent-k/OpenAgent/commit/8d01c4e))
* 多 Agent 系统 — 子 Agent 注册、工具化与 UI 渲染 ([2279f66](https://github.com/consistent-k/OpenAgent/commit/2279f66))

### 🐛 Bug 修复

* 修复快捷键冲突与流中断错误信息优化 ([cb6a084](https://github.com/consistent-k/OpenAgent/commit/cb6a084))

### ♻️ 重构

* 抽取 channel 共享工具层，精简插件实现 ([e1edd66](https://github.com/consistent-k/OpenAgent/commit/e1edd66))

## [1.0.5](https://github.com/consistent-k/OpenAgent/compare/v1.0.4...v1.0.5) (2026-06-06)

### ✨ 新功能

* 多供应商配置与 Provider/Model 选择器 ([bbe2608](https://github.com/consistent-k/OpenAgent/commit/bbe2608))
* 429 限流重试信息展示与 Tips 组件 ([60c2ac5](https://github.com/consistent-k/OpenAgent/commit/60c2ac5))

### 🐛 Bug 修复

* 修复 /update 命令阻塞 TUI 的问题 ([2cddd94](https://github.com/consistent-k/OpenAgent/commit/2cddd94))
* 修复 ESLint 与 Renovate 配置问题 ([07839f2](https://github.com/consistent-k/OpenAgent/commit/07839f2))

### ♻️ 重构

* 统一 overlay 状态管理，简化 Input 组件 props ([809f3c3](https://github.com/consistent-k/OpenAgent/commit/809f3c3))
* 重构发包脚本，自动发现所有 workspace 包 ([bac8f67](https://github.com/consistent-k/OpenAgent/commit/bac8f67))

### 📚 文档

* 同步项目结构文档，抽离为单一维护点 ([225deab](https://github.com/consistent-k/OpenAgent/commit/225deab))

## [1.0.4](https://github.com/consistent-k/OpenAgent/compare/v1.0.3...v1.0.4) (2026-06-04)

### ✨ 新功能

* 新增 i18n 国际化支持与 /locale 命令 ([71152d4](https://github.com/consistent-k/OpenAgent/commit/71152d4))
* 新增 Telegram 渠道插件 ([69beead](https://github.com/consistent-k/OpenAgent/commit/69beead))
* 新增 /update 命令与 oa update CLI 子命令 ([a374cf6](https://github.com/consistent-k/OpenAgent/commit/a374cf6))

### 🐛 Bug 修复

* 修复 CI 中 weixin 包类型检查失败的问题 ([053cb75](https://github.com/consistent-k/OpenAgent/commit/053cb75))

## [1.0.3](https://github.com/consistent-k/OpenAgent/compare/v1.0.2...v1.0.3) (2026-06-03)

### ✨ 新功能

* 会话管理增强与表格渲染优化 ([6d86818](https://github.com/consistent-k/OpenAgent/commit/6d86818))

### ♻️ 重构

* 会话管理重构与 useChatStream 优化 ([906df40](https://github.com/consistent-k/OpenAgent/commit/906df40))
* 重构 agent 模块为 engine 架构 ([ae1cd28](https://github.com/consistent-k/OpenAgent/commit/ae1cd28))

## [1.0.2](https://github.com/consistent-k/OpenAgent/compare/v1.0.1...v1.0.2) (2026-06-02)

*版本升级（无功能变更）*

## [1.0.1](https://github.com/consistent-k/OpenAgent/compare/v1.0.0...v1.0.1) (2026-06-02)

### ♻️ 重构

* weixin 包目录重构与文档更新 ([d0eba0b](https://github.com/consistent-k/OpenAgent/commit/d0eba0b))

## [1.0.0](https://github.com/consistent-k/OpenAgent/releases/tag/v1.0.0) (2026-05-31)

### ✨ 新功能

* 初始化 openagent 项目 ([902a998](https://github.com/consistent-k/OpenAgent/commit/902a998))
* monorepo 重构与 Channel 插件系统 ([21ee92a](https://github.com/consistent-k/OpenAgent/commit/21ee92a))
* 工具目录重构与审批偏好持久化 ([4dfc2eb](https://github.com/consistent-k/OpenAgent/commit/4dfc2eb))
* 配置编辑与输入状态管理重构 ([eccdbec](https://github.com/consistent-k/OpenAgent/commit/eccdbec))
* 添加系统提示词 & 优化 Header 展示 ([9d6cb2f](https://github.com/consistent-k/OpenAgent/commit/9d6cb2f))
* npm 发布准备与文档拆分 ([503c1ac](https://github.com/consistent-k/OpenAgent/commit/503c1ac))

### ♻️ 重构

* 清理无用代码与死导出 ([de326bd](https://github.com/consistent-k/OpenAgent/commit/de326bd))
* 提取共享工具模块与 AGENTS.md 项目上下文支持 ([1f7c78b](https://github.com/consistent-k/OpenAgent/commit/1f7c78b))
* 优化 UI 可见性，重命名主题并合并配色 ([f1baf2f](https://github.com/consistent-k/OpenAgent/commit/f1baf2f))
* 组件主题化及状态栏配色优化 ([f573946](https://github.com/consistent-k/OpenAgent/commit/f573946))

### 📚 文档

* 添加完整技术文档 ([b5f73c1](https://github.com/consistent-k/OpenAgent/commit/b5f73c1))
