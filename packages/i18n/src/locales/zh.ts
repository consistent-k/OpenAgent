/**
 * 中文翻译（默认语言）
 */
export const zh: Record<string, string> = {
    // ── 命令描述 ──
    'command.help.description': '显示所有可用命令；可用 /help /命令 查看单个命令',
    'command.help.availableCommands': '可用命令：\n{helpText}',

    'command.status.description': '显示当前工作目录、文件索引数量和会话状态',
    'command.status.workingDirectory': '工作目录：{cwd}',
    'command.status.fileIndex': '文件索引：{count} 项',
    'command.status.messageCount': '消息数：{count}',
    'command.status.pendingApprovalYes': '待确认工具：有',
    'command.status.pendingApprovalNo': '待确认工具：无',
    'command.status.reloadHint': '提示：工具创建或删除文件后，可运行 /reload 刷新 @文件 补全',

    'command.exit.description': '退出 TUI',

    'command.channel.description': '管理消息渠道（start/stop/login/status）',
    'command.channel.pluginNoRegister': '包 "{pkgName}" 没有导出 register 函数',
    'command.channel.pluginLoadFailed': '加载 channel 插件 "{pkgName}" 失败: {err}',
    'command.channel.specifyChannel': '❌ 请指定 channel，如: /channel {verb} weixin',
    'command.channel.unknownChannel': '❌ 未知 channel: {target}',
    'command.channel.available': '可用: {available}',
    'command.channel.noRegistered': '无已注册的 channel，请在 config.json 中配置 channels',
    'command.channel.alreadyRunning': '⚠️ {name} 已在运行中',
    'command.channel.notConfigured': '❌ {name} 未配置',
    'command.channel.starting': '🤖 {name} 启动中...',
    'command.channel.stopHint': '使用 /channel stop {target} 停止',
    'command.channel.stopped': '⏹️ {name} 已停止',
    'command.channel.exitedWithError': '❌ {name} 异常退出: {err}',
    'command.channel.allStopped': '⏹️ 所有 channel 已停止',
    'command.channel.notRunning': '⚠️ {target} 未在运行',
    'command.channel.channelStopped': '⏹️ {target} 已停止',
    'command.channel.runningStopFirst': '⚠️ {name} 正在运行中，请先 /channel stop {target}',
    'command.channel.loginNotSupported': '❌ {name} 不支持 login 命令',
    'command.channel.logoutNotSupported': '❌ {name} 不支持 logout 命令',
    'command.channel.configFailed': '❌ {name} 配置失败: {err}',
    'command.channel.loginFailed': '❌ {name} 登录失败: {err}',
    'command.channel.noPluginsConfigured': '📭 未配置任何 channel 插件',
    'command.channel.addInConfig': '在 config.json 中添加:',
    'command.channel.configuredNotLoaded': '📭 已配置但未加载: {configured}',
    'command.channel.ensureInstalled': '请确保已安装对应的 npm 包',
    'command.channel.statusHeader': '📡 Channel 状态\n',
    'command.channel.statusRunning': '运行中',
    'command.channel.statusReady': '已就绪',
    'command.channel.statusUnconfigured': '未配置',
    'command.channel.uptime': '   运行时长: {min}m {sec}s',
    'command.channel.commands': '命令:',
    'command.channel.helpStart': '  /channel start <id>    启动',
    'command.channel.helpStop': '  /channel stop <id>     停止',
    'command.channel.helpStopAll': '  /channel stop all      停止所有',

    'command.tools.description': '列出 Agent 可调用的内置工具',
    'command.tools.availableTools': '可用工具：\n{toolNames}',

    'command.reload.description': '重新扫描工作目录，刷新 @文件 补全索引',
    'command.reload.refreshing': '正在刷新文件索引...',
    'command.reload.refreshed': '文件索引已刷新：{count} 项',

    'command.approvals.description': '管理工具审批偏好（始终批准 / 撤销）',
    'command.approvals.label.executeBash': 'Bash 命令执行',
    'command.approvals.label.writeFile': '文件写入',
    'command.approvals.label.editFile': '文件编辑',
    'command.approvals.allCleared': '已清除所有审批偏好，后续工具调用将恢复为默认审批行为。',
    'command.approvals.unknownTool': '未知工具：{toolName}。可配置的工具：{tools}',
    'command.approvals.revoked': '已取消 {toolName} 的自动批准，后续将恢复审批确认。',
    'command.approvals.status.alwaysApproved': '✅ 始终批准',
    'command.approvals.status.needsConfirm': '⬜ 需要确认',
    'command.approvals.header': '**审批偏好：**',
    'command.approvals.helpClear': '- `/approvals clear` — 清除所有偏好',
    'command.approvals.helpRevoke': '- `/approvals revoke <tool>` — 取消某工具的自动批准',

    'command.theme.description': '切换主题（无参数弹出选择，或直接指定主题名）',
    'command.theme.unknownTheme': '未知主题：{name}。可用主题：{themes}',
    'command.theme.switched': '已切换到主题：{name}',

    'command.clear.description': '保存当前会话并开始新会话',
    'command.config.description': '查看并编辑配置',

    'command.sessions.description': '列出并选择已保存的会话进行恢复',
    'command.sessions.noSavedSessions': '暂无已保存会话。',

    'command.update.description': '通过 npm/pnpm/yarn 全局更新 oa 至最新版本',
    'command.update.checking': '正在检查并更新 @oagent/oa ...',

    'command.locale.description': '切换界面语言（无参数显示当前语言，或指定语言代码）',
    'command.locale.current': '当前语言：{locale}',
    'command.locale.available': '可用语言：{locales}',
    'command.locale.switched': '已切换语言：{locale}',
    'command.locale.unknown': '未知语言：{locale}。可用：{locales}',

    'command.agents.description': '列出可用的子 Agent',
    'command.agents.title': '可用 Agent',
    'command.agents.none': '没有注册的子 Agent。可在 AGENTS.md 或 config.json 中定义。',

    // ── UI 组件 ──
    'ui.approval.approve': '批准执行',
    'ui.approval.alwaysApprove': '始终批准此类操作',
    'ui.approval.deny': '拒绝',
    'ui.approval.customInput': '✏️ 自定义输入...',
    'ui.approval.customInputHint': '输入自定义回答，Enter 确认',
    'ui.approval.enterConfirmEscBack': 'Enter 确认 · Esc 返回',
    'ui.approval.selectConfirm': '↑/↓ 选择，Enter 确认',
    'ui.approval.userCancelled': '用户未选择',

    'ui.commandPalette.noMatch': '(无匹配命令)',

    'ui.configPicker.editTitle': '编辑 {label}',
    'ui.configPicker.currentValue': '当前值：{value}',
    'ui.configPicker.title': '配置管理',
    'ui.configPicker.subtitle': '↑/↓ 选择，Enter 编辑',
    'ui.configPicker.currentValueShort': '当前：{value}',
    'ui.configPicker.currentValueNotEditable': '当前：{value}（不可编辑）',
    'ui.configPicker.providers': '供应商管理',

    'ui.providerPicker.title': '供应商管理',
    'ui.providerPicker.subtitle': '↑/↓ 导航，Enter 详情，a 添加，Backspace 删除，Esc 返回',
    'ui.providerPicker.addProvider': '➕ 添加供应商',
    'ui.providerPicker.empty': '暂无供应商，按 a 添加',
    'ui.providerPicker.models': '{count} 个模型',
    'ui.providerPicker.active': '当前',

    'ui.providerDetail.title': '供应商详情 — {name}',
    'ui.providerDetail.subtitle': '↑/↓ 选择字段，Enter 编辑，Esc 返回',
    'ui.providerDetail.name': '名称',
    'ui.providerDetail.baseUrl': 'Base URL',
    'ui.providerDetail.apiKey': 'API Key',
    'ui.providerDetail.models': '模型列表',
    'ui.providerDetail.setActive': '设为当前供应商',
    'ui.providerDetail.delete': '删除供应商',
    'ui.providerDetail.confirmDelete': '确认删除供应商 {name}？',
    'ui.providerDetail.confirmDeleteSubtitle': 'Enter 确认，Esc 取消',
    'ui.providerDetail.isCurrent': '（当前）',

    'ui.providerForm.title': '添加供应商',
    'ui.providerForm.editTitle': '编辑供应商 — {name}',
    'ui.providerForm.name': '供应商名称',
    'ui.providerForm.baseUrl': 'Base URL',
    'ui.providerForm.apiKey': 'API Key',
    'ui.providerForm.models': '模型列表（逗号分隔）',
    'ui.providerForm.namePlaceholder': '如 OpenAI、Anthropic',
    'ui.providerForm.baseUrlPlaceholder': '如 https://api.openai.com/v1',
    'ui.providerForm.apiKeyPlaceholder': 'sk-...',
    'ui.providerForm.modelsPlaceholder': '如 gpt-4o, gpt-4o-mini',
    'ui.providerForm.step': '步骤 {current}/{total}',

    'ui.modelPicker.title': '模型管理 — {provider}',
    'ui.modelPicker.subtitle': '↑/↓ 导航，a 添加，Backspace 删除，Esc 返回',
    'ui.modelPicker.addModel': '➕ 添加模型',
    'ui.modelPicker.empty': '暂无模型，按 a 添加',
    'ui.modelPicker.confirmDelete': '确认删除模型 {model}？',
    'ui.modelPicker.confirmDeleteSubtitle': 'Enter 确认，Esc 取消',
    'ui.modelPicker.inputModel': '输入模型名称',

    'ui.themePicker.dark': 'Dark — 深色主题',
    'ui.themePicker.light': 'Light — 浅色主题',
    'ui.themePicker.mayday': 'Mayday — 五月天配色',
    'ui.themePicker.title': '选择主题',
    'ui.themePicker.subtitle': '↑/↓ 选择，Enter 确认',

    'ui.input.aiResponding': '(AI 正在回复，按 Esc 或 Ctrl+C 停止…)',

    'ui.sessionPicker.title': '会话管理',
    'ui.sessionPicker.subtitle': '↑/↓ 导航，PgUp/PgDn 翻页，Enter 恢复，Backspace 删除',
    'ui.sessionPicker.empty': '暂无已保存会话',
    'ui.sessionPicker.range': '{from}-{to}/{total}',

    'ui.filePicker.noMatch': '无匹配文件: {query}',
    'ui.filePicker.empty': '(空)',

    'ui.reasoning.thinking': 'Thinking…',
    'ui.reasoning.completedThinking': 'Completed thinking',
    'ui.reasoning.thinkingLabel': 'Thinking',

    'ui.shortcutHint.parens': '({shortcut} to {action})',
    'ui.shortcutHint.inline': '{shortcut} to {action}',

    'ui.dialog.enter': 'Enter',
    'ui.dialog.confirm': 'confirm',
    'ui.dialog.esc': 'Esc',
    'ui.dialog.cancel': 'cancel',

    // ── 状态栏 ──
    'status.header.indexing': 'indexing...',
    'status.header.indexError': 'index error',
    'status.header.fileCount': '{count} files',
    'status.header.notConfigured': '未配置',
    'status.header.awaitingApproval': 'awaiting approval',
    'status.header.streaming': 'streaming...',
    'status.header.idle': 'idle',
    'status.header.modelLabel': 'model: ',

    'status.bar.inputLabel': 'in:',
    'status.bar.outputLabel': 'out:',
    'status.bar.noUsage': 'no usage',

    // ── 工具状态 ──
    'tool.state.waitingInput': 'waiting input',
    'tool.state.pending': 'pending',
    'tool.state.awaitingApproval': 'awaiting approval',
    'tool.state.executing': 'executing',
    'tool.state.error': 'error',
    'tool.state.denied': 'denied',

    'tool.agent.parallel': '并行执行',
    'tool.agent.handoff': 'Agent 接力',
    'tool.agent.preparing': '准备中...',
    'tool.agent.pending': '等待中',
    'tool.agent.running': '运行中',
    'tool.result.denied': 'denied',
    'tool.result.checkmark': '✓',
    'tool.result.moreLines': '... ({count} more lines)',

    'tool.verb.reading': 'Reading',
    'tool.verb.read': 'Read',
    'tool.verb.file': 'file',
    'tool.verb.files': 'files',
    'tool.verb.listing': 'Listing',
    'tool.verb.listed': 'Listed',
    'tool.verb.directory': 'directory',
    'tool.verb.directories': 'directories',
    'tool.verb.searching': 'Searching',
    'tool.verb.searched': 'Searched',
    'tool.verb.pattern': 'pattern',
    'tool.verb.patterns': 'patterns',
    'tool.verb.finding': 'Finding',
    'tool.verb.found': 'Found',
    'tool.verb.fetching': 'Fetching',
    'tool.verb.fetched': 'Fetched',
    'tool.verb.url': 'url',
    'tool.verb.urls': 'urls',
    'tool.verb.query': 'query',
    'tool.verb.queries': 'queries',

    'tool.group.errorCount': '({count} error{s})',
    'tool.group.expandHint': '(Ctrl+O to expand)',

    // ── 工具错误消息 ──
    'tool.bash.dangerRefused': 'Refused to execute dangerous command ({reason}): {command}',
    'tool.bash.outputTruncated': '...(output truncated, {kb}KB omitted)',

    'tool.editFile.sameStrings': 'old_string and new_string must be different',
    'tool.editFile.notFound': 'old_string not found in file: {filePath}',
    'tool.editFile.multipleMatches': 'old_string appears {count} times in file. Use replace_all or provide a more specific old_string.',

    'tool.readFile.invalidRange': 'endLine must be >= startLine',
    'tool.readFile.notAFile': 'Path is not a file: {filePath}',
    'tool.readFile.fileTooLarge': 'File too large ({size}KB), exceeds {limit}KB limit',

    'tool.glob.absolutePath': 'glob pattern must be a relative path',
    'tool.glob.parentRef': 'glob pattern cannot contain ".."',

    'tool.grep.invalidRegex': 'Invalid regex pattern: {error}',
    'tool.grep.cannotReadFile': 'Cannot read file: {path}',
    'tool.grep.pathNotExists': 'Path does not exist or is not a file/directory: {path}',

    'tool.fetch.unsupportedProtocol': 'Only http and https URLs are supported',
    'tool.fetch.localhostBlocked': 'Requests to localhost are not allowed',
    'tool.fetch.privateAddressBlocked': 'Requests to private/loopback addresses are not allowed',
    'tool.fetch.resolvesToPrivate': 'Hostname resolves to a private/loopback address',
    'tool.fetch.fetchFailed': 'Failed to fetch URL: {error}',

    'tool.webSearch.apiNotConfigured': 'Search API not configured',
    'tool.webSearch.parseError': 'Unable to parse search API response format',
    'tool.webSearch.noResults': 'No results found',
    'tool.webSearch.searchFailed': 'Search failed: {error}',

    // ── 错误消息 ──
    'error.configNotReady': '⚠️ 配置未完善，请先输入 /config 配置 baseUrl、apiKey、model',
    'error.userDeniedTool': '用户拒绝执行该工具',
    'error.streamInterrupted': '(stream interrupted — tool result not received)',

    'error.safePath.outOfBounds': '非法路径：超出工作目录范围',
    'error.safePath.parentOutOfBounds': '非法路径：父目录指向工作目录外',
    'error.safePath.symlinkEscape': '非法路径：symlink 指向工作目录外',

    'error.session.incompatibleFormat': '会话文件格式不兼容：{sessionId}',

    'error.config.readFailed': '读取配置文件失败：{path}\n{error}',
    'error.config.invalidMaxSteps': '配置字段 maxSteps 必须是 1 到 20 之间的整数',
    'error.config.providerNotFound': '未找到供应商：{name}',
    'error.config.modelNotFound': '供应商 {provider} 中未找到模型：{model}',
    'error.config.providerAlreadyExists': '供应商已存在：{name}',
    'error.config.modelAlreadyExists': '供应商 {provider} 中已存在模型：{model}',

    // ── App.tsx ──
    'app.welcome': '👋 欢迎使用 Open Agent！检测到配置文件尚未完善，请先配置供应商和模型：',
    'app.welcome.providers': '  • providers — 供应商列表（每个包含 name、baseUrl、apiKey、models）',
    'app.welcome.activeModel': '  • activeModel — 当前使用的模型，格式：供应商名/模型名',
    'app.welcome.hint': '输入 /config 打开配置编辑器，或手动编辑 ~/.openagent/config.json',
    'app.configUpdated': '已更新配置 {key}：{value}',
    'app.configSaveFailed': '保存配置失败：{error}',
    'app.providerAdded': '已添加供应商：{name}',
    'app.providerDeleted': '已删除供应商：{name}',
    'app.providerUpdated': '已更新供应商：{name}',
    'app.providerSetActive': '已切换到供应商：{name}，请使用 /config 设置模型',
    'app.modelAdded': '已添加模型 {model} 到供应商 {provider}',
    'app.modelDeleted': '已删除模型 {model}（供应商 {provider}）',
    'app.themeSwitched': '已切换到主题：{name}',
    'app.unknownCommand': '未知命令：{input}（输入 /help 查看可用命令）',
    'app.commandError': '[命令错误] {error}',

    // ── 更新 ──
    'update.notInstalled': '❌ 未检测到全局安装的 {pkgName}，请先通过 npm install -g {pkgName} 安装。',
    'update.alreadyLatest': '✅ 已是最新版本 v{version}',
    'update.success': '✅ 更新完成！v{current} → v{newVersion}\n请重启 oa 以使用新版本。',
    'update.failed': '❌ 更新失败：{error}',

    // ── Tips ──
    'tips.retrying': '⚠ 429 限流，重试中 ({attempt}/{max}) 等待 {delay}s…',

    // ── CLI ──
    'cli.description': 'OpenAgent - 终端 AI Agent 客户端',
    'cli.updateDescription': '通过 npm/pnpm/yarn 全局更新 oa 至最新版本'
};
