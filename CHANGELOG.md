# Changelog

本文档记录 OpenAgent 的所有重要变更。

## [1.1.0](https://github.com/consistent-k/OpenAgent/compare/oa-v1.0.5...oa-v1.1.0) (2026-06-07)


### ✨ 新功能

* 429 限流重试信息展示与 Tips 组件 ([60c2ac5](https://github.com/consistent-k/OpenAgent/commit/60c2ac5f10b2b69fa4a5a530c92433cb1170a3fa))
* monorepo 重构与 Channel 插件系统 ([21ee92a](https://github.com/consistent-k/OpenAgent/commit/21ee92ac9033b02480081372b2de49e7bf2a4964))
* npm 发布准备与文档拆分 ([503c1ac](https://github.com/consistent-k/OpenAgent/commit/503c1ac858179537e63c434b2364205daa9f2243))
* 会话管理增强与表格渲染优化 ([6d86818](https://github.com/consistent-k/OpenAgent/commit/6d8681804300c41fc1145274d5387a2361ac9cb4))
* 初始化 openagent 项目 ([902a998](https://github.com/consistent-k/OpenAgent/commit/902a998d59a84a54c5ea4e93baca4b1a39caf53f))
* 初始提交 ([fd88af1](https://github.com/consistent-k/OpenAgent/commit/fd88af123f1ce8e68ef84c17b583efabe920b5a1))
* 多 Agent 系统 — 子 Agent 注册、工具化与 UI 渲染 ([2279f66](https://github.com/consistent-k/OpenAgent/commit/2279f6693b4a2de1e6c2211a61cde10340db7fe9))
* 多供应商配置与 Provider/Model 选择器 ([bbe2608](https://github.com/consistent-k/OpenAgent/commit/bbe26083cf8f17d00c3e012900777d170697e35a))
* 工具目录重构与审批偏好持久化 ([4dfc2eb](https://github.com/consistent-k/OpenAgent/commit/4dfc2eb1adaec236111cdde3d535dd83ad000745))
* 新增 /update 命令与 oa update CLI 子命令 ([a374cf6](https://github.com/consistent-k/OpenAgent/commit/a374cf6b81d52be64d1c6de60c2607cab206772e))
* 新增 i18n 国际化支持与 /locale 命令 ([71152d4](https://github.com/consistent-k/OpenAgent/commit/71152d4c7c13ad0feca7a1b4f7d19aaa23a8a156))
* 新增 Telegram 渠道插件 ([69beead](https://github.com/consistent-k/OpenAgent/commit/69beead4af9eb7761c1064eb4017ceea6f309ec3))
* 添加系统提示词&优化Header展示 ([9d6cb2f](https://github.com/consistent-k/OpenAgent/commit/9d6cb2fc6b72134a72a666a3fa667afc19ef869a))
* 迁移 standard-version 到 release-please ([8d01c4e](https://github.com/consistent-k/OpenAgent/commit/8d01c4e6d91bfe6b0e1e7d6fe485b56b9096b0c0))
* 配置编辑与输入状态管理重构 ([eccdbec](https://github.com/consistent-k/OpenAgent/commit/eccdbeccb775af8db3b8af83695785cc21d3ad5f))


### 🐛 Bug 修复

* 修复 /update 命令阻塞 TUI 的问题 ([2cddd94](https://github.com/consistent-k/OpenAgent/commit/2cddd9427d82debe2a99d4d3c6adef5d95229759))
* 修复 CI 中 weixin 包类型检查失败的问题 ([053cb75](https://github.com/consistent-k/OpenAgent/commit/053cb75d416f9c7e0220eedd7cd0c70316d28f46))
* 修复 ESLint 与 Renovate 配置问题 ([07839f2](https://github.com/consistent-k/OpenAgent/commit/07839f2deb8e3c0524463156e8de2160f56c55ed))
* 修复快捷键冲突与流中断错误信息优化 ([cb6a084](https://github.com/consistent-k/OpenAgent/commit/cb6a0841caae72528bd92a1d8a0bfc980cfcad6a))


### ♻️ 重构

* weixin 包目录重构与文档更新 ([d0eba0b](https://github.com/consistent-k/OpenAgent/commit/d0eba0b05d3aff8ab0ff43c1f4c79246421e33ff))
* 优化 UI 可见性，重命名主题并合并配色 ([f1baf2f](https://github.com/consistent-k/OpenAgent/commit/f1baf2faa187cdabb7b7b0bdebdd028a0778a9c1))
* 会话管理重构与 useChatStream 优化 ([906df40](https://github.com/consistent-k/OpenAgent/commit/906df40f5a3dfb6364f7ad6d68c64d0528bf593a))
* 抽取 channel 共享工具层，精简插件实现 ([e1edd66](https://github.com/consistent-k/OpenAgent/commit/e1edd66110b0878a11a1728147c16ce39d9c7b00))
* 提取共享工具模块与 AGENTS.md 项目上下文支持 ([1f7c78b](https://github.com/consistent-k/OpenAgent/commit/1f7c78b3d4b41bc596110b08a103ce2f6fab4ece))
* 清理无用代码与死导出 ([de326bd](https://github.com/consistent-k/OpenAgent/commit/de326bdded3434484f695149e9fb55675893ed9e))
* 组件主题化及状态栏配色优化 ([f573946](https://github.com/consistent-k/OpenAgent/commit/f5739464aa46e6fde5796cfbc28ac17b3709ec63))
* 统一 overlay 状态管理，简化 Input 组件 props ([809f3c3](https://github.com/consistent-k/OpenAgent/commit/809f3c38eb3193e59ae0ebb8a39695d90b1d7aaa))
* 重构 agent 模块为 engine 架构 ([ae1cd28](https://github.com/consistent-k/OpenAgent/commit/ae1cd28264814a7ebbc6e0f63c26b9673bdc2b6c))
* 重构发包脚本，自动发现所有 workspace 包 ([bac8f67](https://github.com/consistent-k/OpenAgent/commit/bac8f671f950ff7fb82df5f94554c2f088089eb5))


### 📚 文档

* 同步项目结构文档，抽离为单一维护点 ([225deab](https://github.com/consistent-k/OpenAgent/commit/225deabab3c3cdacbd125c5682fb153f5a7be581))
* 添加完整技术文档 ([b5f73c1](https://github.com/consistent-k/OpenAgent/commit/b5f73c192e7cf12d64850e2b6919cdfe76dc3f52))
* 补全历史 changelog（release-please 格式） ([7d53fd6](https://github.com/consistent-k/OpenAgent/commit/7d53fd655072236b7dc74c45180cba1facdedfff))

## [1.0.5](https://github.com/consistent-k/OpenAgent/compare/v1.0.4...v1.0.5) (2026-06-06)

### 🐛 Bug 修复

* 修复 /update 命令阻塞 TUI 的问题 ([2cddd94](https://github.com/consistent-k/OpenAgent/commit/2cddd9427d82debe2a99d4d3c6adef5d95229759))
* 修复 ESLint 与 Renovate 配置问题 ([07839f2](https://github.com/consistent-k/OpenAgent/commit/07839f2deb8e3c0524463156e8de2160f56c55ed))

### ✨ 新功能

* 429 限流重试信息展示与 Tips 组件 ([60c2ac5](https://github.com/consistent-k/OpenAgent/commit/60c2ac5f10b2b69fa4a5a530c92433cb1170a3fa))
* 多供应商配置与 Provider/Model 选择器 ([bbe2608](https://github.com/consistent-k/OpenAgent/commit/bbe26083cf8f17d00c3e012900777d170697e35a))

### ♻️ 重构

* 统一 overlay 状态管理，简化 Input 组件 props ([809f3c3](https://github.com/consistent-k/OpenAgent/commit/809f3c38eb3193e59ae0ebb8a39695d90b1d7aaa))
* 重构发包脚本，自动发现所有 workspace 包 ([bac8f67](https://github.com/consistent-k/OpenAgent/commit/bac8f671f950ff7fb82df5f94554c2f088089eb5))

### 📚 文档

* 同步项目结构文档，抽离为单一维护点 ([225deab](https://github.com/consistent-k/OpenAgent/commit/225deabab3c3cdacbd125c5682fb153f5a7be581))
* 用 standard-version 替换手动版本管理 ([e2c2db5](https://github.com/consistent-k/OpenAgent/commit/e2c2db501852f52e6486720e2ae6ea69ec577da6))

## [1.0.4](https://github.com/consistent-k/OpenAgent/compare/v1.0.3...v1.0.4) (2026-06-04)

### ✨ 新功能

* 新增 /update 命令与 oa update CLI 子命令 ([a374cf6](https://github.com/consistent-k/OpenAgent/commit/a374cf6b81d52be64d1c6de60c2607cab206772e))
* 新增 Telegram 渠道插件 ([69beead](https://github.com/consistent-k/OpenAgent/commit/69beead4af9eb7761c1064eb4017ceea6f309ec3))
* 新增 i18n 国际化支持与 /locale 命令 ([71152d4](https://github.com/consistent-k/OpenAgent/commit/71152d4c7c13ad0feca7a1b4f7d19aaa23a8a156))

### 🐛 Bug 修复

* 修复 CI 中 weixin 包类型检查失败的问题 ([053cb75](https://github.com/consistent-k/OpenAgent/commit/053cb75d416f9c7e0220eedd7cd0c70316d28f46))

## [1.0.3](https://github.com/consistent-k/OpenAgent/compare/v1.0.1...v1.0.3) (2026-06-03)

### ✨ 新功能

* 会话管理增强与表格渲染优化 ([6d86818](https://github.com/consistent-k/OpenAgent/commit/6d8681804300c41fc1145274d5387a2361ac9cb4))

### ♻️ 重构

* 重构 agent 模块为 engine 架构 ([ae1cd28](https://github.com/consistent-k/OpenAgent/commit/ae1cd28264814a7ebbc6e0f63c26b9673bdc2b6c))
* 会话管理重构与 useChatStream 优化 ([906df40](https://github.com/consistent-k/OpenAgent/commit/906df40f5a3dfb6364f7ad6d68c64d0528bf593a))

## [1.0.1](https://github.com/consistent-k/OpenAgent/compare/v1.0.0...v1.0.1) (2026-06-02)

### ♻️ 重构

* weixin 包目录重构与文档更新 ([d0eba0b](https://github.com/consistent-k/OpenAgent/commit/d0eba0b05d3aff8ab0ff43c1f4c79246421e33ff))

## [1.0.0](https://github.com/consistent-k/OpenAgent/releases/tag/v1.0.0) (2026-05-31)

### ✨ 新功能

* npm 发布准备与文档拆分 ([503c1ac](https://github.com/consistent-k/OpenAgent/commit/503c1ac858179537e63c434b2364205daa9f2243))
* monorepo 重构与 Channel 插件系统 ([21ee92a](https://github.com/consistent-k/OpenAgent/commit/21ee92ac9033b02480081372b2de49e7bf2a4964))
* 工具目录重构与审批偏好持久化 ([4dfc2eb](https://github.com/consistent-k/OpenAgent/commit/4dfc2eb1adaec236111cdde3d535dd83ad000745))
* 配置编辑与输入状态管理重构 ([eccdbec](https://github.com/consistent-k/OpenAgent/commit/eccdbeccb775af8db3b8af83695785cc21d3ad5f))
* 添加系统提示词 & 优化 Header 展示 ([9d6cb2f](https://github.com/consistent-k/OpenAgent/commit/9d6cb2fc6b72134a72a666a3fa667afc19ef869a))

### ♻️ 重构

* 优化 UI 可见性，重命名主题并合并配色 ([f1baf2f](https://github.com/consistent-k/OpenAgent/commit/f1baf2faa187cdabb7b7b0bdebdd028a0778a9c1))
* 组件主题化及状态栏配色优化 ([f573946](https://github.com/consistent-k/OpenAgent/commit/f5739464aa46e6fde5796cfbc28ac17b3709ec63))
* 清理无用代码与死导出 ([de326bd](https://github.com/consistent-k/OpenAgent/commit/de326bdded3434484f695149e9fb55675893ed9e))
* 提取共享工具模块与 AGENTS.md 项目上下文支持 ([1f7c78b](https://github.com/consistent-k/OpenAgent/commit/1f7c78b3d4b41bc596110b08a103ce2f6fab4ece))

### 📚 文档

* 添加完整技术文档 ([b5f73c1](https://github.com/consistent-k/OpenAgent/commit/b5f73c192e7cf12d64850e2b6919cdfe76dc3f52))

## [0.1.0](https://github.com/consistent-k/OpenAgent/releases/tag/v0.1.0) (2026-05-28)

### ✨ 新功能

* 初始化 openagent 项目 ([902a998](https://github.com/consistent-k/OpenAgent/commit/902a998d59a84a54c5ea4e93baca4b1a39caf53f))
* 初始提交 ([fd88af1](https://github.com/consistent-k/OpenAgent/commit/fd88af123f1ce8e68ef84c17b583efabe920b5a1))
