/** @type {import('standard-version').Options} */
module.exports = {
    header: '# Changelog\n\n本文档记录 OpenAgent 的所有重要变更。\n',
    types: [
        { type: 'feat', section: '✨ 新功能' },
        { type: 'fix', section: '🐛 Bug 修复' },
        { type: 'perf', section: '⚡ 性能优化' },
        { type: 'refactor', section: '♻️ 重构' },
        { type: 'docs', section: '📚 文档' },
        { type: 'chore', section: false },
        { type: 'ci', section: false },
        { type: 'test', section: false },
        { type: 'style', section: false }
    ],
    commitUrlFormat: 'https://github.com/consistent-k/OpenAgent/commit/{{hash}}',
    compareUrlFormat: 'https://github.com/consistent-k/OpenAgent/compare/{{previousTag}}...{{currentTag}}',
    issueUrlFormat: 'https://github.com/consistent-k/OpenAgent/issues/{{id}}',
    scripts: {
        postbump: 'bash scripts/sync-version.sh'
    }
};
