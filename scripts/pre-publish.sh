#!/usr/bin/env bash
set -euo pipefail

# 发包前校验（由 prepublishOnly 钩子调用）
# 参考 antd 的 pre-publish 策略，确保发布的版本经过 CI 验证

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO=$(node -p "require('$ROOT/package.json').repository.url.replace('https://github.com/', '').replace('.git', '')")
VERSION=$(node -p "require('$ROOT/package.json').version")

echo "🔍 发包前校验 v$VERSION ..."
echo ""

# ── 1. 检查版本号是否已存在于 npm ────────────────────
if npm view "@oagent/oa@$VERSION" version 2>/dev/null; then
    echo "❌ 版本 $VERSION 已存在于 npm，请先升级版本号"
    echo "   运行: pnpm version:all patch"
    exit 1
fi
echo "  ✅ 版本 $VERSION 未发布"

# ── 2. 检查在 main 分支 ──────────────────────────────
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" != "main" ]]; then
    echo "❌ 请先切换到 main 分支（当前: $BRANCH）"
    exit 1
fi
echo "  ✅ 当前在 main 分支"

# ── 3. 检查 git 工作区干净 ───────────────────────────
if [[ -n "$(git status --porcelain)" ]]; then
    echo "❌ 工作区不干净，请先提交所有改动"
    exit 1
fi
echo "  ✅ 工作区干净"

# ── 4. 检查 CI 状态 ──────────────────────────────────
COMMIT_SHA=$(git rev-parse HEAD)
if [[ -z "${GITHUB_TOKEN:-}" ]]; then
    echo "  ⚠️  未设置 GITHUB_TOKEN，跳过 CI 状态检查"
else
    CI_STATUS=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
        "https://api.github.com/repos/$REPO/commits/$COMMIT_SHA/check-runs" | \
        node -e "
        const data = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
        const runs = data.check_runs || [];
        const success = runs.filter(r => r.conclusion === 'success');
        const failed = runs.filter(r => r.conclusion === 'failure');
        const pending = runs.filter(r => r.status === 'in_progress' || r.status === 'queued');
        if (failed.length > 0) { console.log('failed'); }
        else if (pending.length > 0) { console.log('pending'); }
        else if (success.length > 0) { console.log('success'); }
        else { console.log('none'); }
        ")

    case "$CI_STATUS" in
        success)
            echo "  ✅ CI 已通过"
            ;;
        failed)
            echo "❌ CI 未通过，请先修复"
            exit 1
            ;;
        pending)
            echo "❌ CI 仍在运行中，请等待完成"
            exit 1
            ;;
        none)
            echo "  ⚠️  未找到 CI 记录，跳过检查"
            ;;
    esac
fi

echo ""
echo "✅ 所有校验通过，可以发布"
