# Changelog

## [1.1.0](https://github.com/consistent-k/OpenAgent/compare/@oagent/core-v1.0.5...@oagent/core-v1.1.0) (2026-06-07)


### ✨ 新功能

* 429 限流重试信息展示与 Tips 组件 ([60c2ac5](https://github.com/consistent-k/OpenAgent/commit/60c2ac5f10b2b69fa4a5a530c92433cb1170a3fa))
* monorepo 重构与 Channel 插件系统 ([21ee92a](https://github.com/consistent-k/OpenAgent/commit/21ee92ac9033b02480081372b2de49e7bf2a4964))
* npm 发布准备与文档拆分 ([503c1ac](https://github.com/consistent-k/OpenAgent/commit/503c1ac858179537e63c434b2364205daa9f2243))
* 会话管理增强与表格渲染优化 ([6d86818](https://github.com/consistent-k/OpenAgent/commit/6d8681804300c41fc1145274d5387a2361ac9cb4))
* 多 Agent 系统 — 子 Agent 注册、工具化与 UI 渲染 ([2279f66](https://github.com/consistent-k/OpenAgent/commit/2279f6693b4a2de1e6c2211a61cde10340db7fe9))
* 多供应商配置与 Provider/Model 选择器 ([bbe2608](https://github.com/consistent-k/OpenAgent/commit/bbe26083cf8f17d00c3e012900777d170697e35a))
* 新增 /update 命令与 oa update CLI 子命令 ([a374cf6](https://github.com/consistent-k/OpenAgent/commit/a374cf6b81d52be64d1c6de60c2607cab206772e))
* 新增 i18n 国际化支持与 /locale 命令 ([71152d4](https://github.com/consistent-k/OpenAgent/commit/71152d4c7c13ad0feca7a1b4f7d19aaa23a8a156))
* 新增 Telegram 渠道插件 ([69beead](https://github.com/consistent-k/OpenAgent/commit/69beead4af9eb7761c1064eb4017ceea6f309ec3))


### 🐛 Bug 修复

* 修复 /update 命令阻塞 TUI 的问题 ([2cddd94](https://github.com/consistent-k/OpenAgent/commit/2cddd9427d82debe2a99d4d3c6adef5d95229759))
* 修复快捷键冲突与流中断错误信息优化 ([cb6a084](https://github.com/consistent-k/OpenAgent/commit/cb6a0841caae72528bd92a1d8a0bfc980cfcad6a))


### ♻️ 重构

* weixin 包目录重构与文档更新 ([d0eba0b](https://github.com/consistent-k/OpenAgent/commit/d0eba0b05d3aff8ab0ff43c1f4c79246421e33ff))
* 会话管理重构与 useChatStream 优化 ([906df40](https://github.com/consistent-k/OpenAgent/commit/906df40f5a3dfb6364f7ad6d68c64d0528bf593a))
* 抽取 channel 共享工具层，精简插件实现 ([e1edd66](https://github.com/consistent-k/OpenAgent/commit/e1edd66110b0878a11a1728147c16ce39d9c7b00))
* 统一 overlay 状态管理，简化 Input 组件 props ([809f3c3](https://github.com/consistent-k/OpenAgent/commit/809f3c38eb3193e59ae0ebb8a39695d90b1d7aaa))
* 重构 agent 模块为 engine 架构 ([ae1cd28](https://github.com/consistent-k/OpenAgent/commit/ae1cd28264814a7ebbc6e0f63c26b9673bdc2b6c))
