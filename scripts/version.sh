#!/usr/bin/env bash
set -euo pipefail

# 统一升级所有 @oagent 包的版本号
# 用法:
#   pnpm version:all patch        # 1.1.1 -> 1.1.2
#   pnpm version:all minor        # 1.1.1 -> 1.2.0
#   pnpm version:all major        # 1.1.1 -> 2.0.0
#   pnpm version:all 2.0.0        # 直接指定版本

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ── 1. 校验参数 ──────────────────────────────────────
if [[ $# -lt 1 ]]; then
    echo "❌ 请指定版本号或 semver 级别"
    echo "用法: pnpm version:all <patch|minor|major|x.y.z>"
    exit 1
fi

BUMP="$1"

# ── 2. 校验 git 状态 ─────────────────────────────────
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" != "main" ]]; then
    echo "❌ 请先切换到 main 分支（当前: $BRANCH）"
    exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
    echo "❌ 工作区不干净，请先提交或暂存所有改动"
    exit 1
fi

# ── 3. 读取当前版本并计算新版本 ──────────────────────
CURRENT=$(node -p "require('$ROOT/package.json').version")
echo "📌 当前版本: $CURRENT"

if [[ "$BUMP" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    NEW_VERSION="$BUMP"
else
    NEW_VERSION=$(node -p "
    (() => {
        const [major, minor, patch] = '$CURRENT'.split('.').map(Number);
        if ('$BUMP' === 'major') return \`\${major + 1}.0.0\`;
        if ('$BUMP' === 'minor') return \`\${major}.\${minor + 1}.0\`;
        if ('$BUMP' === 'patch') return \`\${major}.\${minor}.\${patch + 1}\`;
        console.error('Invalid bump: $BUMP');
        process.exit(1);
    })();
    ")
fi

echo "📌 新版本:   $NEW_VERSION"
echo ""

# ── 4. 更新所有 package.json ─────────────────────────
FILES=("$ROOT/package.json")
for pkg in "$ROOT/packages/"*/package.json; do
    FILES+=("$pkg")
done

for file in "${FILES[@]}"; do
    node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('$file', 'utf8'));
    pkg.version = '$NEW_VERSION';
    fs.writeFileSync('$file', JSON.stringify(pkg, null, 4) + '\n');
    "
    name=$(node -p "require('$file').name")
    echo "  ✅ $name -> $NEW_VERSION"
done

echo ""

# ── 5. git commit + tag ──────────────────────────────
git add "${FILES[@]}"
git commit -m "chore: release v$NEW_VERSION"
git tag "v$NEW_VERSION"

echo ""
echo "✅ 已创建 commit 和 tag v$NEW_VERSION"
echo ""
echo "📤 请手动推送:"
echo "   git push && git push --tags"
