import { Box, useApp, useInput } from 'ink';
import { useCallback, useEffect, useRef, useState } from 'react';
import { findCommand, COMMANDS, parseCommandInput } from './commands';
import { getConfigSummary, saveConfig, reloadConfig, isConfigReady, type OpenAgentConfig } from './config';
import { useChatStream } from './hooks/useChatStream';
import { useFileIndex } from './hooks/useFileIndex';
import type { ConfigItem } from './ui/chat/ConfigPicker';
import { Input } from './ui/chat/Input';
import { MessageList } from './ui/messages/MessageList';
import { PartRenderer } from './ui/messages/PartRenderer';
import { Header } from './ui/status/Header';
import { StatusBar } from './ui/status/StatusBar';
import { ThemeProvider, useTheme, type ThemeName } from './ui/text/theme';
import { getErrorMessage } from './utils/errors';
import { loadSession, saveSession } from './utils/sessions';
import type { SessionSummary } from './utils/sessions';
import { uid } from './utils/uid';

export function App() {
    return (
        <ThemeProvider>
            <AppContent />
        </ThemeProvider>
    );
}

function AppContent() {
    const { exit } = useApp();
    const { themeName, setThemeName } = useTheme();
    const cwd = process.cwd();
    const { fileIndex, status: fileIndexStatus, reload: reloadFileIndex } = useFileIndex(cwd);
    const {
        messages,
        displayMessages,
        status,
        usage,
        modelId,
        pendingApproval,
        send,
        approvePendingTool,
        alwaysApprovePendingTool,
        denyPendingTool,
        selectQuestionOption,
        appendMessages,
        setSession,
        reset,
        cancel
    } = useChatStream({
        fileIndex,
        cwd
    });

    const [inputValue, setInputValue] = useState('');
    const [showReasoning, setShowReasoning] = useState(false);
    const [showToolDetails, setShowToolDetails] = useState(false);
    const [sessionPicker, setSessionPicker] = useState<SessionSummary[] | null>(null);
    const [themePickerOpen, setThemePickerOpen] = useState(false);
    const [configPickerOpen, setConfigPickerOpen] = useState(false);

    // 启动时检查配置，未完善则引导用户
    const configChecked = useRef(false);
    useEffect(() => {
        if (configChecked.current) return;
        configChecked.current = true;
        if (!isConfigReady()) {
            appendMessages([
                {
                    id: uid(),
                    role: 'assistant',
                    parts: [
                        {
                            type: 'text',
                            text: [
                                '👋 欢迎使用 Open Agent！检测到配置文件尚未完善，请先配置以下必填项：',
                                '',
                                '  • baseUrl — API 服务地址',
                                '  • apiKey  — API 密钥',
                                '  • model   — 模型名称',
                                '',
                                '输入 /config 打开配置编辑器，或手动编辑 ~/.openagent/config.json'
                            ].join('\n'),
                            state: 'done'
                        }
                    ]
                }
            ]);
        }
    }, [appendMessages]);

    const getConfigItems = useCallback((): ConfigItem[] => {
        const config = getConfigSummary();
        return [
            { key: 'baseUrl', label: 'Base URL', value: config.baseUrl, editable: true },
            { key: 'apiKey', label: 'API Key', value: config.apiKey, editable: true },
            { key: 'model', label: 'Model', value: config.model, editable: true },
            { key: 'maxSteps', label: 'Max Steps', value: String(config.maxSteps), editable: true }
        ];
    }, []);

    const [configItems, setConfigItems] = useState<ConfigItem[]>([]);

    const handleSaveConfig = useCallback(
        (key: string, value: string) => {
            const updates: Partial<OpenAgentConfig> = {};
            if (key === 'maxSteps') {
                updates.maxSteps = Number(value);
            } else {
                (updates as Record<string, string>)[key] = value;
            }
            try {
                saveConfig(updates);
                reloadConfig();
                setConfigItems(getConfigItems());
                setConfigPickerOpen(false);
                setInputValue('');
                appendMessages([
                    { id: uid(), role: 'user', parts: [{ type: 'text', text: `/config` }] },
                    { id: uid(), role: 'assistant', parts: [{ type: 'text', text: `已更新配置 ${key}：${key === 'apiKey' ? '****' : value}`, state: 'done' }] }
                ]);
            } catch (error) {
                appendMessages([
                    { id: uid(), role: 'user', parts: [{ type: 'text', text: `/config` }] },
                    { id: uid(), role: 'assistant', parts: [{ type: 'text', text: `保存配置失败：${getErrorMessage(error)}`, state: 'done' }] }
                ]);
            }
        },
        [getConfigItems, appendMessages]
    );

    const handleCancelPicker = useCallback(() => {
        setSessionPicker(null);
        setThemePickerOpen(false);
        setConfigPickerOpen(false);
    }, []);

    const lastIdx = displayMessages.length - 1;
    const lastMessage = lastIdx >= 0 ? displayMessages[lastIdx] : null;
    const isStreaming = status === 'streaming' && lastMessage?.role === 'assistant';
    const historyMessages = isStreaming ? displayMessages.slice(0, -1) : displayMessages;
    const streamingMessage = isStreaming ? lastMessage : null;

    const saveCurrentSession = useCallback(async () => {
        if (messages.length === 0 && displayMessages.length === 0) return;
        try {
            await saveSession(cwd, messages, displayMessages);
        } catch {
            // empty
        }
    }, [cwd, messages, displayMessages]);

    const handleSelectSession = useCallback(
        async (name: string) => {
            await saveCurrentSession();
            try {
                const session = await loadSession(cwd, name);
                setSession(session.messages, session.displayMessages);
            } catch {
                // ignore
            }
            setSessionPicker(null);
            setInputValue('');
        },
        [cwd, setSession, saveCurrentSession]
    );

    const handleSelectTheme = useCallback(
        (name: ThemeName) => {
            setThemeName(name);
            setThemePickerOpen(false);
            setInputValue('');
            appendMessages([
                { id: uid(), role: 'user', parts: [{ type: 'text', text: `/theme` }] },
                { id: uid(), role: 'assistant', parts: [{ type: 'text', text: `已切换到主题：${name}`, state: 'done' }] }
            ]);
        },
        [setThemeName, appendMessages]
    );

    useInput((input, key) => {
        if (key.ctrl && input === 'r') {
            setShowReasoning((v) => !v);
        } else if (key.ctrl && input === 'o') {
            setShowToolDetails((v) => !v);
        } else if ((key.ctrl && input === 'c') || key.escape) {
            if (status === 'streaming' || status === 'awaiting_approval') {
                cancel();
            }
        }
    });

    const handleSubmit = useCallback(
        async (text: string, highlightedCommand?: string) => {
            if (!text.trim()) return;
            const trimmed = text.trim();

            if (trimmed.startsWith('/')) {
                setInputValue('');
                const parsed = parseCommandInput(trimmed);
                const cmdName = highlightedCommand ?? parsed.name;
                const cmd = findCommand(cmdName);
                const resolvedInput = parsed.args.length > 0 ? `${cmdName} ${parsed.args.join(' ')}` : cmdName;
                if (!cmd) {
                    appendMessages([
                        { id: uid(), role: 'user', parts: [{ type: 'text', text: resolvedInput }] },
                        { id: uid(), role: 'assistant', parts: [{ type: 'text', text: `未知命令：${resolvedInput}（输入 /help 查看可用命令）`, state: 'done' }] }
                    ]);
                    return;
                }
                try {
                    await cmd.run({
                        rawInput: resolvedInput,
                        args: parsed.args,
                        cwd,
                        fileIndexCount: fileIndex.length,
                        messages,
                        displayMessages,
                        pendingApproval: pendingApproval !== null,
                        appendMessages,
                        setSession,
                        saveCurrentSession,
                        resetSession: reset,
                        cancelResponse: cancel,
                        reloadFileIndex,
                        exit,
                        listCommands: () => COMMANDS,
                        showSessionPicker: setSessionPicker,
                        themeName,
                        setThemeName: (name) => setThemeName(name),
                        showThemePicker: () => setThemePickerOpen(true),
                        showConfigPicker: () => {
                            setConfigItems(getConfigItems());
                            setConfigPickerOpen(true);
                        }
                    });
                } catch (error) {
                    appendMessages([
                        { id: uid(), role: 'user', parts: [{ type: 'text', text: resolvedInput }] },
                        { id: uid(), role: 'assistant', parts: [{ type: 'text', text: `[命令错误] ${getErrorMessage(error)}`, state: 'done' }] }
                    ]);
                }
                return;
            }

            setInputValue('');
            await send(text);
        },
        [
            appendMessages,
            reset,
            reloadFileIndex,
            exit,
            send,
            cwd,
            fileIndex.length,
            messages,
            displayMessages,
            pendingApproval,
            setSession,
            cancel,
            saveCurrentSession,
            setSessionPicker,
            themeName,
            setThemeName,
            getConfigItems
        ]
    );

    return (
        <Box flexDirection="column">
            <Header status={status} fileIndexStatus={fileIndexStatus} fileIndexCount={fileIndex.length} pendingApproval={pendingApproval !== null} />
            {historyMessages.length > 0 && <MessageList messages={historyMessages} showReasoning={showReasoning} showToolDetails={showToolDetails} />}
            {streamingMessage && (
                <Box flexDirection="column" paddingX={1}>
                    <Box flexDirection="column" marginBottom={1}>
                        {streamingMessage.parts.map((part, pi) => (
                            <PartRenderer key={`stream-${pi}`} part={part} partIndex={pi} messageId="stream" showReasoning={showReasoning} />
                        ))}
                    </Box>
                </Box>
            )}
            <Input
                value={inputValue}
                onChange={setInputValue}
                onSubmit={handleSubmit}
                disabled={status === 'streaming'}
                fileIndex={fileIndex}
                pendingApproval={pendingApproval}
                onApprove={approvePendingTool}
                onAlwaysApprove={alwaysApprovePendingTool}
                onDeny={denyPendingTool}
                onSelectOption={selectQuestionOption}
                sessionPicker={sessionPicker}
                onSelectSession={handleSelectSession}
                themePicker={themePickerOpen ? themeName : null}
                onSelectTheme={handleSelectTheme}
                configPicker={configPickerOpen ? configItems : null}
                onSaveConfig={handleSaveConfig}
                onCancelPicker={handleCancelPicker}
            />
            <StatusBar cwd={cwd} modelId={modelId} usage={usage} />
        </Box>
    );
}
