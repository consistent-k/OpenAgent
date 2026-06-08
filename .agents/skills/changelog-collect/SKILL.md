---
name: changelog-collect
description: 收集更新日志、生成 changelog、版本对比
---

# Changelog 收集 Skill

收集两个版本之间的 commit，按类型分组后生成 changelog 条目，写入 `CHANGELOG.md`。

## 触发关键词

"收集 changelog"、"生成 changelog"、"更新 changelog"、"版本对比"

## 工作流程

### 第一步：确定版本范围

1. 运行 `git tag --sort=-v:refname` 获取所有 tag 列表
2. 询问用户要生成哪个版本的 changelog（默认为最新 tag 到上一个 tag）
3. 确定范围：`FROM_TAG..TO_TAG`（TO_TAG 通常是 HEAD 或指定 tag）

### 第二步：收集 commit

1. 运行 `git log FROM_TAG..TO_TAG --oneline --no-merges` 获取 commit 列表
2. 解析每条 commit 的 type、scope、subject：
    - 格式：`type(scope): subject` 或 `type: subject`
    - 有效的 type：`feat`、`fix`、`perf`、`refactor`、`docs`、`chore`、`test`、`ci`、`style`、`build`
3. 过滤掉以下类型的 commit（不写入 changelog）：
    - `chore`（除非影响用户可见行为）
    - `test`
    - `ci`
    - `build`
    - `style`（纯格式调整）

### 第三步：分类与格式化

根据 commit type 映射到 changelog 分类：

| type       | 分类        | emoji |
| ---------- | ----------- | ----- |
| `feat`     | ✨ 新功能   | ✨    |
| `fix`      | 🐛 Bug 修复 | 🐛    |
| `perf`     | ⚡ 性能优化 | ⚡    |
| `refactor` | ♻️ 重构     | ♻️    |
| `docs`     | 📚 文档     | 📚    |

对于不在上表中的 type（如 `style` 如果保留），归入 ♻️ 重构。

**格式化规则：**

- 每条 entry 格式：`* subject ([short-hash](commit-url))`
- commit-url 格式：`https://github.com/consistent-k/OpenAgent/commit/<hash>`
- subject 保持原始 commit message，首字母不强制大写
- 如果 commit 有 scope，在 subject 前加上 scope 前缀：`* scope: subject ([hash](url))`

### 第四步：按包分组（可选）

如果某个分类下有 3 条以上 commit，且 commit 的 scope 能明确归属到某个包（`core`、`agents`、`channels`、`weixin`、`telegram`、`i18n`），则按包名分组：

```
### ✨ 新功能

- core：描述 ([hash](url))
- core：描述 ([hash](url))
- weixin：描述 ([hash](url))
```

如果 scope 不明确或条目较少，不分组，直接平铺。

### 第五步：生成 changelog 内容

输出格式（与现有 CHANGELOG.md 保持一致）：

```markdown
## [VERSION](https://github.com/consistent-k/OpenAgent/compare/FROM_TAG...TO_TAG) (YYYY-MM-DD)

### ✨ 新功能

- 描述 ([hash](url))

### 🐛 Bug 修复

- 描述 ([hash](url))

### ♻️ 重构

- 描述 ([hash](url))
```

- VERSION 从目标 tag 提取（去掉 `v` 前缀），如果目标是 HEAD 则询问用户版本号
- 日期使用当天日期
- 每个分类之间空一行
- 如果某个分类没有 commit，省略该分类

### 第六步：确认并写入

1. 将生成的内容展示给用户确认
2. 用户确认后，读取 `CHANGELOG.md`，找到 `# Changelog` 标题和第一个 `## [` 之间的位置
3. 插入新版本的 changelog 内容
4. 运行 `pnpm format` 确保格式一致

## 注意事项

- 如果 PR/commit 包含 `BREAKING CHANGE` 或 `!` 标记，在 changelog 顶部添加 `### 💥 Breaking Changes` 分类
- 跳过 merge commit（`--no-merges` 已处理）
- 跳过 revert commit（以 `revert:` 或 `Revert` 开头的）
- 如果 commit message 是英文，翻译为中文（与现有 changelog 风格一致）
