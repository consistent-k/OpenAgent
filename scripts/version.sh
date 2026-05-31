#!/usr/bin/env bash
set -euo pipefail

# 统一更新所有包版本号
# 用法: pnpm version:all patch|minor|major

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUMP="${1:-patch}"

if [[ ! "$BUMP" =~ ^(patch|minor|major)$ ]]; then
    echo "❌ 用法: pnpm version:all patch|minor|major"
    exit 1
fi

# 从主包读取当前版本
CURRENT=$(node -p "require('$ROOT/package.json').version")
echo "📌 当前版本: $CURRENT"

# 计算新版本
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"
case "$BUMP" in
    major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
    minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
    patch) PATCH=$((PATCH + 1)) ;;
esac
NEW="$MAJOR.$MINOR.$PATCH"

echo "🔖 新版本: $NEW ($BUMP)"
echo ""

# 更新所有 package.json
for pkg in "$ROOT/package.json" "$ROOT/packages/"*/package.json; do
    sed -i '' "s/\"version\": \"$CURRENT\"/\"version\": \"$NEW\"/" "$pkg"
    echo "  ✅ $(basename "$(dirname "$pkg")")/package.json"
done

# 更新子包对主包的 workspace 依赖（不需要，workspace:* 会自动解析）

echo ""
echo "✅ 所有包版本已更新为 $NEW"
