/**
 * English translations
 */
export const en: Record<string, string> = {
    // ── Command descriptions ──
    'command.help.description': 'Show all available commands; use /help <command> to view a single command',
    'command.help.availableCommands': 'Available commands:\n{helpText}',

    'command.status.description': 'Show current working directory, file index count and session status',
    'command.status.workingDirectory': 'Working directory: {cwd}',
    'command.status.fileIndex': 'File index: {count} items',
    'command.status.messageCount': 'Messages: {count}',
    'command.status.pendingApprovalYes': 'Pending approval: Yes',
    'command.status.pendingApprovalNo': 'Pending approval: No',
    'command.status.reloadHint': 'Tip: After tools create or delete files, run /reload to refresh @file completions',

    'command.exit.description': 'Exit TUI',

    'command.channel.description': 'Manage messaging channels (start/stop/login/status)',
    'command.channel.pluginNoRegister': 'Package "{pkgName}" does not export a register function',
    'command.channel.pluginLoadFailed': 'Failed to load channel plugin "{pkgName}": {err}',
    'command.channel.specifyChannel': '❌ Please specify a channel, e.g: /channel {verb} weixin',
    'command.channel.unknownChannel': '❌ Unknown channel: {target}',
    'command.channel.available': 'Available: {available}',
    'command.channel.noRegistered': 'No registered channels. Configure channels in config.json',
    'command.channel.alreadyRunning': '⚠️ {name} is already running',
    'command.channel.notConfigured': '❌ {name} is not configured',
    'command.channel.starting': '🤖 {name} starting...',
    'command.channel.stopHint': 'Use /channel stop {target} to stop',
    'command.channel.stopped': '⏹️ {name} stopped',
    'command.channel.exitedWithError': '❌ {name} exited with error: {err}',
    'command.channel.allStopped': '⏹️ All channels stopped',
    'command.channel.notRunning': '⚠️ {target} is not running',
    'command.channel.channelStopped': '⏹️ {target} stopped',
    'command.channel.runningStopFirst': '⚠️ {name} is running, please /channel stop {target} first',
    'command.channel.loginNotSupported': '❌ {name} does not support the login command',
    'command.channel.logoutNotSupported': '❌ {name} does not support the logout command',
    'command.channel.configFailed': '❌ {name} configuration failed: {err}',
    'command.channel.loginFailed': '❌ {name} login failed: {err}',
    'command.channel.noPluginsConfigured': '📭 No channel plugins configured',
    'command.channel.addInConfig': 'Add to config.json:',
    'command.channel.configuredNotLoaded': '📭 Configured but not loaded: {configured}',
    'command.channel.ensureInstalled': 'Please ensure the corresponding npm package is installed',
    'command.channel.statusHeader': '📡 Channel Status\n',
    'command.channel.statusRunning': 'Running',
    'command.channel.statusReady': 'Ready',
    'command.channel.statusUnconfigured': 'Not configured',
    'command.channel.uptime': '   Uptime: {min}m {sec}s',
    'command.channel.commands': 'Commands:',
    'command.channel.helpStart': '  /channel start <id>    Start',
    'command.channel.helpStop': '  /channel stop <id>     Stop',
    'command.channel.helpStopAll': '  /channel stop all      Stop all',

    'command.tools.description': 'List built-in tools available to the Agent',
    'command.tools.availableTools': 'Available tools:\n{toolNames}',

    'command.reload.description': 'Rescan working directory, refresh @file completion index',
    'command.reload.refreshing': 'Refreshing file index...',
    'command.reload.refreshed': 'File index refreshed: {count} items',

    'command.approvals.description': 'Manage tool approval preferences (always approve / revoke)',
    'command.approvals.label.executeBash': 'Bash command execution',
    'command.approvals.label.writeFile': 'File writing',
    'command.approvals.label.editFile': 'File editing',
    'command.approvals.allCleared': 'All approval preferences cleared. Tool calls will revert to default approval behavior.',
    'command.approvals.unknownTool': 'Unknown tool: {toolName}. Configurable tools: {tools}',
    'command.approvals.revoked': 'Revoked auto-approval for {toolName}. Approval confirmation will be restored.',
    'command.approvals.status.alwaysApproved': '✅ Always approved',
    'command.approvals.status.needsConfirm': '⬜ Needs confirmation',
    'command.approvals.header': '**Approval preferences:**',
    'command.approvals.helpClear': '- `/approvals clear` — Clear all preferences',
    'command.approvals.helpRevoke': '- `/approvals revoke <tool>` — Revoke auto-approval for a tool',

    'command.theme.description': 'Switch theme (no args opens picker, or specify theme name directly)',
    'command.theme.unknownTheme': 'Unknown theme: {name}. Available themes: {themes}',
    'command.theme.switched': 'Switched to theme: {name}',

    'command.clear.description': 'Save current session and start a new one',
    'command.config.description': 'View and edit configuration',

    'command.sessions.description': 'List and select saved sessions to restore',
    'command.sessions.noSavedSessions': 'No saved sessions.',

    'command.update.description': 'Globally update oa to the latest version via npm/pnpm/yarn',
    'command.update.checking': 'Checking and updating @oagent/oa ...',

    'command.locale.description': 'Switch interface language (no args shows current, or specify language code)',
    'command.locale.current': 'Current language: {locale}',
    'command.locale.available': 'Available languages: {locales}',
    'command.locale.switched': 'Language switched: {locale}',
    'command.locale.unknown': 'Unknown language: {locale}. Available: {locales}',

    'command.agents.description': 'List available sub-agents',
    'command.agents.title': 'Available Agents',
    'command.agents.none': 'No sub-agents registered. Define agents in AGENTS.md or config.json.',

    // ── UI components ──
    'ui.approval.approve': 'Approve',
    'ui.approval.alwaysApprove': 'Always approve this type',
    'ui.approval.deny': 'Deny',
    'ui.approval.customInput': '✏️ Custom input...',
    'ui.approval.customInputHint': 'Type custom answer, press Enter to confirm',
    'ui.approval.enterConfirmEscBack': 'Enter to confirm · Esc to go back',
    'ui.approval.selectConfirm': '↑/↓ to select, Enter to confirm',
    'ui.approval.userCancelled': 'User did not select',

    'ui.commandPalette.noMatch': '(No matching commands)',

    'ui.configPicker.editTitle': 'Edit {label}',
    'ui.configPicker.editSubtitle': 'Enter to confirm, Esc back',
    'ui.configPicker.title': 'Configuration',
    'ui.configPicker.subtitle': '↑/↓ navigate, Enter to edit, Esc back',
    'ui.configPicker.currentValueShort': 'Current: {value}',
    'ui.configPicker.currentValueNotEditable': 'Current: {value} (not editable)',
    'ui.configPicker.providers': 'Provider Management',
    'ui.configPicker.selectModel': 'Select Model',
    'ui.configPicker.selectModelSubtitle': '↑/↓ navigate, Enter confirm, Esc back',
    'ui.configPicker.noModels': 'No models available, please configure providers and models first',

    'ui.providerPicker.title': 'Provider Management',
    'ui.providerPicker.subtitle': '↑/↓ navigate, Enter details, a add, Backspace delete, Esc back',
    'ui.providerPicker.addProvider': '➕ Add Provider',
    'ui.providerPicker.empty': 'No providers yet, press a to add',
    'ui.providerPicker.models': '{count} model(s)',
    'ui.providerPicker.active': 'current',

    'ui.providerDetail.title': 'Provider Details — {name}',
    'ui.providerDetail.subtitle': '↑/↓ select field, Enter edit, Esc back',
    'ui.providerDetail.name': 'Name',
    'ui.providerDetail.baseUrl': 'Base URL',
    'ui.providerDetail.apiKey': 'API Key',
    'ui.providerDetail.models': 'Models',
    'ui.providerDetail.setActive': 'Set as Active Provider',
    'ui.providerDetail.delete': 'Delete Provider',
    'ui.providerDetail.confirmDelete': 'Confirm delete provider {name}?',
    'ui.providerDetail.confirmDeleteSubtitle': 'Enter to confirm, Esc to cancel',
    'ui.providerDetail.isCurrent': '(current)',

    'ui.providerForm.title': 'Add Provider',
    'ui.providerForm.editTitle': 'Edit Provider — {name}',
    'ui.providerForm.name': 'Provider Name',
    'ui.providerForm.baseUrl': 'Base URL',
    'ui.providerForm.apiKey': 'API Key',
    'ui.providerForm.models': 'Models (comma-separated)',
    'ui.providerForm.namePlaceholder': 'e.g. OpenAI, Anthropic',
    'ui.providerForm.baseUrlPlaceholder': 'e.g. https://api.openai.com/v1',
    'ui.providerForm.apiKeyPlaceholder': 'sk-...',
    'ui.providerForm.modelsPlaceholder': 'e.g. gpt-4o, gpt-4o-mini',
    'ui.providerForm.step': 'Step {current}/{total}',

    'ui.modelPicker.title': 'Model Management — {provider}',
    'ui.modelPicker.subtitle': '↑/↓ navigate, a add, Backspace delete, Esc back',
    'ui.modelPicker.addModel': '➕ Add Model',
    'ui.modelPicker.empty': 'No models yet, press a to add',
    'ui.modelPicker.confirmDelete': 'Confirm delete model {model}?',
    'ui.modelPicker.confirmDeleteSubtitle': 'Enter to confirm, Esc to cancel',
    'ui.modelPicker.inputModel': 'Enter model name',

    'ui.themePicker.dark': 'Dark — Dark theme',
    'ui.themePicker.light': 'Light — Light theme',
    'ui.themePicker.mayday': 'Mayday — Mayday theme',
    'ui.themePicker.title': 'Select theme',
    'ui.themePicker.subtitle': '↑/↓ to select, Enter to confirm',

    'ui.input.aiResponding': '(AI is responding, press Esc or Ctrl+C to stop…)',

    'ui.sessionPicker.title': 'Sessions',
    'ui.sessionPicker.subtitle': '↑/↓ navigate, PgUp/PgDn page, Enter load, Backspace delete',
    'ui.sessionPicker.empty': 'No saved sessions',
    'ui.sessionPicker.range': '{from}-{to}/{total}',

    'ui.filePicker.noMatch': 'No matching files: {query}',
    'ui.filePicker.empty': '(empty)',

    'ui.reasoning.thinking': 'Thinking…',
    'ui.reasoning.completedThinking': 'Completed thinking',
    'ui.reasoning.thinkingLabel': 'Thinking',

    'ui.shortcutHint.parens': '({shortcut} to {action})',
    'ui.shortcutHint.inline': '{shortcut} to {action}',

    'ui.dialog.enter': 'Enter',
    'ui.dialog.confirm': 'confirm',
    'ui.dialog.esc': 'Esc',
    'ui.dialog.cancel': 'cancel',

    // ── Status bar ──
    'status.header.indexing': 'indexing...',
    'status.header.indexError': 'index error',
    'status.header.fileCount': '{count} files',
    'status.header.notConfigured': 'Not configured',
    'status.header.awaitingApproval': 'awaiting approval',
    'status.header.streaming': 'streaming...',
    'status.header.idle': 'idle',
    'status.header.modelLabel': 'model: ',

    'status.bar.inputLabel': 'in:',
    'status.bar.outputLabel': 'out:',
    'status.bar.noUsage': 'no usage',

    // ── Tool states ──
    'tool.state.waitingInput': 'waiting input',
    'tool.state.pending': 'pending',
    'tool.state.awaitingApproval': 'awaiting approval',
    'tool.state.executing': 'executing',
    'tool.state.error': 'error',
    'tool.state.denied': 'denied',

    'tool.agent.parallel': 'Parallel Execution',
    'tool.agent.handoff': 'Agent Handoff',
    'tool.agent.preparing': 'Preparing...',
    'tool.agent.pending': 'Waiting',
    'tool.agent.running': 'Running',
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

    // ── Tool error messages ──
    'tool.bash.dangerRefused': 'Refused to execute dangerous command ({reason}): {command}',
    'tool.bash.outputTruncated': '...(output truncated, {kb}KB omitted)',

    'tool.editFile.sameStrings': 'old_string and new_string must be different',
    'tool.editFile.notFound': 'old_string not found in file: {filePath}',
    'tool.editFile.multipleMatches': 'old_string appears {count} times in file. Use replace_all or provide a more specific old_string.',

    'tool.readFile.invalidRange': 'endLine must be >= startLine',
    'tool.readFile.notAFile': 'Path is not a file: {filePath}',
    'tool.readFile.fileTooLarge': 'File too large ({size}KB), exceeds {limit}KB limit',
    'tool.readFile.startLineExceeds': 'startLine {startLine} exceeds total lines {totalLines}',

    'tool.writeFile.fileAlreadyExists': 'File already exists: {filePath}',
    'tool.writeFile.notAFile': 'Path exists but is not a file: {filePath}',

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

    // ── Error messages ──
    'error.configNotReady': '⚠️ Configuration incomplete. Please run /config to set baseUrl, apiKey, and model',
    'error.userDeniedTool': 'User denied tool execution',
    'error.streamInterrupted': '(stream interrupted — tool result not received)',

    'error.safePath.outOfBounds': 'Illegal path: outside working directory',
    'error.safePath.parentOutOfBounds': 'Illegal path: parent directory points outside working directory',
    'error.safePath.symlinkEscape': 'Illegal path: symlink points outside working directory',

    'error.session.incompatibleFormat': 'Incompatible session file format: {sessionId}',

    'error.config.readFailed': 'Failed to read config file: {path}\n{error}',
    'error.config.invalidMaxSteps': 'Config field maxSteps must be an integer between 1 and 20',
    'error.config.providerNotFound': 'Provider not found: {name}',
    'error.config.modelNotFound': 'Model not found in provider {provider}: {model}',
    'error.config.providerAlreadyExists': 'Provider already exists: {name}',
    'error.config.modelAlreadyExists': 'Model already exists in provider {provider}: {model}',

    // ── App.tsx ──
    'app.welcome': '👋 Welcome to Open Agent! Configuration file is incomplete. Please configure your providers and model:',
    'app.welcome.providers': '  • providers — Provider list (each with name, baseUrl, apiKey, models)',
    'app.welcome.activeModel': '  • activeModel — Active model in format: ProviderName/ModelName',
    'app.welcome.hint': 'Enter /config to open the config editor, or manually edit ~/.openagent/config.json',
    'app.configUpdated': 'Updated config {key}: {value}',
    'app.configSaveFailed': 'Failed to save config: {error}',
    'app.providerAdded': 'Added provider: {name}',
    'app.providerDeleted': 'Deleted provider: {name}',
    'app.providerUpdated': 'Updated provider: {name}',
    'app.providerSetActive': 'Switched to provider: {name}. Use /config to set a model',
    'app.modelAdded': 'Added model {model} to provider {provider}',
    'app.modelDeleted': 'Deleted model {model} from provider {provider}',
    'app.themeSwitched': 'Switched to theme: {name}',
    'app.unknownCommand': 'Unknown command: {input} (type /help to see available commands)',
    'app.commandError': '[Command error] {error}',

    // ── Update ──
    'update.notInstalled': '❌ Global installation of {pkgName} not detected. Please install via npm install -g {pkgName}.',
    'update.alreadyLatest': '✅ Already on the latest version v{version}',
    'update.success': '✅ Update complete! v{current} → v{newVersion}\nPlease restart oa to use the new version.',
    'update.failed': '❌ Update failed: {error}',

    // ── Tips ──
    'tips.retrying': '⚠ 429 rate limited, retrying ({attempt}/{max}) waiting {delay}s…',

    // ── CLI ──
    'cli.description': 'OpenAgent - Terminal AI Agent Client',
    'cli.updateDescription': 'Globally update oa to the latest version via npm/pnpm/yarn'
};
