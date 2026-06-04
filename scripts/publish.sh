#!/usr/bin/env bash
set -euo pipefail

# 发布所有 @oagent 包（版本号必须一致）
# 用法:
#   pnpm publish:all            # 正式发布
#   pnpm publish:all --dry-run  # 预览模式，不实际发布

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DRY_RUN=""
if [[ "${1:-}" == "--dry-run" ]]; then
    DRY_RUN="--dry-run"
    echo "🔍 预览模式（不会实际发布）"
    echo ""
fi

# ── 1. 检查所有包版本号一致 ──────────────────────────
VERSIONS=()
for pkg in "$ROOT/package.json" "$ROOT/packages/"*/package.json; do
    v=$(node -p "require('$pkg').version")
    VERSIONS+=("$v")
done

UNIQUE=($(printf '%s\n' "${VERSIONS[@]}" | sort -u))
if [[ ${#UNIQUE[@]} -gt 1 ]]; then
    echo "❌ 版本号不一致:"
    for pkg in "$ROOT/package.json" "$ROOT/packages/"*/package.json; do
        name=$(node -p "require('$pkg').name")
        ver=$(node -p "require('$pkg').version")
        echo "  $name: $ver"
    done
    echo ""
    echo "请先运行: pnpm version:all patch"
    exit 1
fi

VERSION="${VERSIONS[0]}"

# ── 2. 列出所有待发布包 ─────────────────────────────
echo "📦 即将发布以下包 (v$VERSION):"
for pkg in "$ROOT/package.json" "$ROOT/packages/"*/package.json; do
    name=$(node -p "require('$pkg').name")
    private=$(node -p "require('$pkg').private || false")
    if [[ "$private" == "true" ]]; then
        echo "  ⏭  $name (private, 跳过)"
    else
        echo "  ✅  $name"
    fi
done
echo ""

# ── 3. 构建所有包（pnpm -r 自动按依赖顺序） ─────────
echo "🔨 Building all packages..."
cd "$ROOT" && pnpm build
echo ""

# ── 4. 发布所有包（pnpm -r 自动按依赖顺序，跳过 private） ──
echo "🚀 Publishing all packages..."
cd "$ROOT" && pnpm -r publish --access public --no-git-checks $DRY_RUN

echo ""
echo "✅ All packages published at v$VERSION!"
