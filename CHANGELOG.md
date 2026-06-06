# Changelog

本文档记录 OpenAgent 的所有重要变更。

## [1.0.4](https://github.com/consistent-k/OpenAgent/compare/v1.0.3...v1.0.4) (2026-06-04)

### ✨ 新功能

- 新增 /update 命令与 oa update CLI 子命令 ([a374cf6](https://github.com/consistent-k/OpenAgent/commit/a374cf6b81d52be64d1c6de60c2607cab206772e))
- 新增 Telegram 渠道插件 ([69beead](https://github.com/consistent-k/OpenAgent/commit/69beead4af9eb7761c1064eb4017ceea6f309ec3))
- 新增 i18n 国际化支持与 /locale 命令 ([71152d4](https://github.com/consistent-k/OpenAgent/commit/71152d4c7c13ad0feca7a1b4f7d19aaa23a8a156))

### 🐛 Bug 修复

- 修复 CI 中 weixin 包类型检查失败的问题 ([053cb75](https://github.com/consistent-k/OpenAgent/commit/053cb75d416f9c7e0220eedd7cd0c70316d28f46))

## [1.0.3](https://github.com/consistent-k/OpenAgent/compare/v1.0.1...v1.0.3) (2026-06-03)

### ✨ 新功能

- 会话管理增强与表格渲染优化 ([6d86818](https://github.com/consistent-k/OpenAgent/commit/6d8681804300c41fc1145274d5387a2361ac9cb4))

### ♻️ 重构

- 重构 agent 模块为 engine 架构 ([ae1cd28](https://github.com/consistent-k/OpenAgent/commit/ae1cd28264814a7ebbc6e0f63c26b9673bdc2b6c))
- 会话管理重构与 useChatStream 优化 ([906df40](https://github.com/consistent-k/OpenAgent/commit/906df40f5a3dfb6364f7ad6d68c64d0528bf593a))

## [1.0.1](https://github.com/consistent-k/OpenAgent/compare/v1.0.0...v1.0.1) (2026-06-02)

### ♻️ 重构

- weixin 包目录重构与文档更新 ([d0eba0b](https://github.com/consistent-k/OpenAgent/commit/d0eba0b05d3aff8ab0ff43c1f4c79246421e33ff))

## [1.0.0](https://github.com/consistent-k/OpenAgent/releases/tag/v1.0.0) (2026-05-31)

### ✨ 新功能

- npm 发布准备与文档拆分 ([503c1ac](https://github.com/consistent-k/OpenAgent/commit/503c1ac858179537e63c434b2364205daa9f2243))
- monorepo 重构与 Channel 插件系统 ([21ee92a](https://github.com/consistent-k/OpenAgent/commit/21ee92ac9033b02480081372b2de49e7bf2a4964))
- 工具目录重构与审批偏好持久化 ([4dfc2eb](https://github.com/consistent-k/OpenAgent/commit/4dfc2eb1adaec236111cdde3d535dd83ad000745))
- 配置编辑与输入状态管理重构 ([eccdbec](https://github.com/consistent-k/OpenAgent/commit/eccdbeccb775af8db3b8af83695785cc21d3ad5f))
- 添加系统提示词 & 优化 Header 展示 ([9d6cb2f](https://github.com/consistent-k/OpenAgent/commit/9d6cb2fc6b72134a72a666a3fa667afc19ef869a))

### ♻️ 重构

- 优化 UI 可见性，重命名主题并合并配色 ([f1baf2f](https://github.com/consistent-k/OpenAgent/commit/f1baf2faa187cdabb7b7b0bdebdd028a0778a9c1))
- 组件主题化及状态栏配色优化 ([f573946](https://github.com/consistent-k/OpenAgent/commit/f5739464aa46e6fde5796cfbc28ac17b3709ec63))
- 清理无用代码与死导出 ([de326bd](https://github.com/consistent-k/OpenAgent/commit/de326bdded3434484f695149e9fb55675893ed9e))
- 提取共享工具模块与 AGENTS.md 项目上下文支持 ([1f7c78b](https://github.com/consistent-k/OpenAgent/commit/1f7c78b3d4b41bc596110b08a103ce2f6fab4ece))

### 📚 文档

- 添加完整技术文档 ([b5f73c1](https://github.com/consistent-k/OpenAgent/commit/b5f73c192e7cf12d64850e2b6919cdfe76dc3f52))

## [0.1.0](https://github.com/consistent-k/OpenAgent/releases/tag/v0.1.0) (2026-05-28)

### ✨ 新功能

- 初始化 openagent 项目 ([902a998](https://github.com/consistent-k/OpenAgent/commit/902a998d59a84a54c5ea4e93baca4b1a39caf53f))
- 初始提交 ([fd88af1](https://github.com/consistent-k/OpenAgent/commit/fd88af123f1ce8e68ef84c17b583efabe920b5a1))
