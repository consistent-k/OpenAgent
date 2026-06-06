#!/usr/bin/env bash
set -euo pipefail

echo "Select version bump type:"
select bump in patch minor major; do
    case $bump in
        patch|minor|major) break ;;
        *) echo "Invalid choice, please enter 1, 2, or 3." ;;
    esac
done

echo ""
echo "Running: standard-version --release-as $bump"
npx standard-version --release-as "$bump"
