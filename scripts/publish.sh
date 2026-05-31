#!/usr/bin/env bash
set -euo pipefail

# 发布所有 @oagent 包（版本号必须一致）
# 用法: pnpm publish:all

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# 检查所有包版本号一致
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
echo "📦 Building all packages (v$VERSION)..."
cd "$ROOT/packages/channels" && pnpm build
cd "$ROOT/packages/weixin" && pnpm build
cd "$ROOT" && pnpm build

echo ""
echo "🚀 Publishing @oagent/channels@$VERSION..."
cd "$ROOT/packages/channels" && npm publish --access public

echo ""
echo "🚀 Publishing @oagent/weixin@$VERSION..."
cd "$ROOT/packages/weixin" && npm publish --access public

echo ""
echo "🚀 Publishing @oagent/oa@$VERSION..."
cd "$ROOT" && npm publish --access public

echo ""
echo "✅ All packages published at v$VERSION!"
