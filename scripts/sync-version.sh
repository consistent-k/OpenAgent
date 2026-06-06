#!/usr/bin/env bash
set -euo pipefail

# 从根 package.json 读取版本号，同步到所有子包
# 由 standard-version 的 postbump 生命周期钩子调用

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NEW=$(node -p "require('$ROOT/package.json').version")

for pkg in "$ROOT/packages/"*/package.json; do
    sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW\"/" "$pkg"
    echo "  ✅ $(basename "$(dirname "$pkg")")/package.json → $NEW"
done
