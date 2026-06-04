import { t } from '@oagent/i18n';
import { Box, Text, useApp, useInput } from 'ink';
import { useCallback, useEffect, useRef, useState } from 'react';
import { findCommand, COMMANDS, parseCommandInput } from './commands';
import { getConfigSummary, saveConfig, reloadConfig, isConfigReady, type OpenAgentConfig } from './config';
import { useChatStream } from './hooks/useChatStream';
import { useFileIndex } from './hooks/useFileIndex';
import { useLocaleSetup } from './hooks/useLocaleSetup';
import type { ConfigItem } from './ui/chat/ConfigPicker';
import { Input } from './ui/chat/Input';
import { MessageList } from './ui/messages/MessageList';
import { PartRenderer } from './ui/messages/PartRenderer';
import { Header } from './ui/status/Header';
import { StatusBar } from './ui/status/StatusBar';
import { ThemeProvider, useTheme, type ThemeName } from './ui/text/theme';
import { getErrorMessage } from './utils/errors';
import { appendHistory, deleteSession, listSessions, loadSession, saveSession } from './utils/sessions';
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
        displayMessages,
        status,
        usage,
        modelId,
        pendingApproval,
        error,
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

    const sessionIdRef = useRef<string>(uid());
    const newSessionId = useCallback(() => {
        sessionIdRef.current = uid();
    }, []);

    useLocaleSetup();

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
                            text: [t('app.welcome'), '', t('app.welcome.baseUrl'), t('app.welcome.apiKey'), t('app.welcome.model'), '', t('app.welcome.hint')].join('\n'),
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
            { key: 'maxSteps', label: 'Max Steps', value: String(config.maxSteps), editable: true },
            { key: 'locale', label: 'Language', value: config.locale, editable: true }
        ];
    }, []);

    const [configItems, setConfigItems] = useState<ConfigItem[]>([]);

    const handleSaveConfig = useCallback(
        (key: string, value: string) => {
            const updates: Partial<OpenAgentConfig> & { locale?: string } = {};
            if (key === 'maxSteps') {
                updates.maxSteps = Number(value);
            } else if (key === 'locale') {
                updates.locale = value;
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
                    { id: uid(), role: 'assistant', parts: [{ type: 'text', text: t('app.configUpdated', { key, value: key === 'apiKey' ? '****' : value }), state: 'done' }] }
                ]);
            } catch (error) {
                appendMessages([
                    { id: uid(), role: 'user', parts: [{ type: 'text', text: `/config` }] },
                    { id: uid(), role: 'assistant', parts: [{ type: 'text', text: t('app.configSaveFailed', { error: getErrorMessage(error) }), state: 'done' }] }
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
        if (displayMessages.length === 0) return;
        try {
            await saveSession(sessionIdRef.current, cwd, displayMessages);
        } catch {
            // empty
        }
    }, [cwd, displayMessages]);

    const handleSelectSession = useCallback(
        async (sessionId: string) => {
            await saveCurrentSession();
            try {
                const session = await loadSession(sessionId);
                setSession(session.displayMessages);
                sessionIdRef.current = sessionId;
            } catch {
                // ignore
            }
            setSessionPicker(null);
            setInputValue('');
        },
        [setSession, saveCurrentSession]
    );

    const handleDeleteSession = useCallback(
        async (sessionId: string) => {
            await deleteSession(sessionId);
            const updated = await listSessions(cwd);
            setSessionPicker(updated.length > 0 ? updated : null);
        },
        [cwd]
    );

    const handleSelectTheme = useCallback(
        (name: ThemeName) => {
            setThemeName(name);
            setThemePickerOpen(false);
            setInputValue('');
            appendMessages([
                { id: uid(), role: 'user', parts: [{ type: 'text', text: `/theme` }] },
                { id: uid(), role: 'assistant', parts: [{ type: 'text', text: t('app.themeSwitched', { name }), state: 'done' }] }
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

                // 记录解析后的完整命令到 history.jsonl
                appendHistory(resolvedInput, cwd, sessionIdRef.current).catch(() => {});

                if (!cmd) {
                    appendMessages([
                        { id: uid(), role: 'user', parts: [{ type: 'text', text: resolvedInput }] },
                        { id: uid(), role: 'assistant', parts: [{ type: 'text', text: t('app.unknownCommand', { input: resolvedInput }), state: 'done' }] }
                    ]);
                    return;
                }
                try {
                    await cmd.run({
                        rawInput: resolvedInput,
                        args: parsed.args,
                        cwd,
                        fileIndexCount: fileIndex.length,
                        displayMessages,
                        pendingApproval: pendingApproval !== null,
                        appendMessages,
                        setSession,
                        saveCurrentSession,
                        newSessionId,
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
                        { id: uid(), role: 'assistant', parts: [{ type: 'text', text: t('app.commandError', { error: getErrorMessage(error) }), state: 'done' }] }
                    ]);
                }
                return;
            }

            // 记录普通消息到 history.jsonl
            appendHistory(trimmed, cwd, sessionIdRef.current).catch(() => {});
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
            displayMessages,
            pendingApproval,
            setSession,
            cancel,
            saveCurrentSession,
            newSessionId,
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
            {error && (
                <Box flexDirection="column" paddingX={1} marginBottom={1}>
                    <Text color="red">⚠️ {error.message}</Text>
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
                onDeleteSession={handleDeleteSession}
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
