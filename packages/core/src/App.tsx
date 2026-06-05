import { t } from '@oagent/i18n';
import { Box, useApp, useInput } from 'ink';
import { useCallback, useEffect, useRef, useState } from 'react';
import { findCommand, COMMANDS, parseCommandInput } from './commands';
import {
    getConfigSummary,
    saveConfig,
    reloadConfig,
    isConfigReady,
    setActiveModel,
    getProviders,
    addProvider,
    deleteProvider,
    updateProvider,
    addModel,
    deleteModel,
    getActiveProviderName,
    type ProviderConfig
} from './config';
import { useChatStream } from './hooks/useChatStream';
import { useFileIndex } from './hooks/useFileIndex';
import { useLocaleSetup } from './hooks/useLocaleSetup';
import type { ConfigItem } from './ui/chat/ConfigPicker';
import { Input } from './ui/chat/Input';
import { MessageList } from './ui/messages/MessageList';
import { PartRenderer } from './ui/messages/PartRenderer';
import { Header } from './ui/status/Header';
import { StatusBar } from './ui/status/StatusBar';
import { Tips } from './ui/status/Tips';
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
    const { fileIndex, reload: reloadFileIndex } = useFileIndex(cwd);
    const {
        displayMessages,
        status,
        usage,
        modelId,
        pendingApproval,
        tip,
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
    const [providerPickerOpen, setProviderPickerOpen] = useState(false);
    const [providerList, setProviderList] = useState<ProviderConfig[]>([]);

    const refreshProviderList = useCallback(() => {
        setProviderList(getProviders());
    }, []);

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
                            text: [t('app.welcome'), '', t('app.welcome.providers'), t('app.welcome.activeModel'), '', t('app.welcome.hint')].join('\n'),
                            state: 'done'
                        }
                    ]
                }
            ]);
        }
    }, [appendMessages]);

    const getConfigItems = useCallback((): ConfigItem[] => {
        const config = getConfigSummary();
        const activeModelDisplay = config.provider && config.model ? `${config.provider}/${config.model}` : config.model || '-';
        return [
            { key: 'activeModel', label: 'Active Model', value: activeModelDisplay, editable: true },
            { key: 'maxSteps', label: 'Max Steps', value: String(config.maxSteps), editable: true },
            { key: 'locale', label: 'Language', value: config.locale, editable: true }
        ];
    }, []);

    const [configItems, setConfigItems] = useState<ConfigItem[]>([]);

    const handleSaveConfig = useCallback(
        (key: string, value: string) => {
            try {
                if (key === 'activeModel') {
                    // 解析 "ProviderName/ModelName" 格式
                    const slashIndex = value.indexOf('/');
                    if (slashIndex === -1) {
                        throw new Error('格式应为：供应商名/模型名，如 OpenAI/gpt-4o');
                    }
                    const providerName = value.slice(0, slashIndex);
                    const modelName = value.slice(slashIndex + 1);
                    setActiveModel(providerName, modelName);
                } else if (key === 'maxSteps') {
                    saveConfig({ maxSteps: Number(value) });
                } else if (key === 'locale') {
                    saveConfig({ locale: value });
                }
                reloadConfig();
                setConfigItems(getConfigItems());
                setConfigPickerOpen(false);
                setInputValue('');
                appendMessages([
                    { id: uid(), role: 'user', parts: [{ type: 'text', text: `/config` }] },
                    { id: uid(), role: 'assistant', parts: [{ type: 'text', text: t('app.configUpdated', { key, value }), state: 'done' }] }
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

    const handleManageProviders = useCallback(() => {
        refreshProviderList();
        setConfigPickerOpen(false);
        setProviderPickerOpen(true);
    }, [refreshProviderList]);

    const handleBackToConfig = useCallback(() => {
        setProviderPickerOpen(false);
        setConfigItems(getConfigItems());
        setConfigPickerOpen(true);
    }, [getConfigItems]);

    const handleAddProvider = useCallback(
        (provider: ProviderConfig) => {
            try {
                addProvider(provider);
                reloadConfig();
                refreshProviderList();
                appendMessages([
                    { id: uid(), role: 'user', parts: [{ type: 'text', text: '/config' }] },
                    { id: uid(), role: 'assistant', parts: [{ type: 'text', text: t('app.providerAdded', { name: provider.name }), state: 'done' }] }
                ]);
            } catch (error) {
                appendMessages([
                    { id: uid(), role: 'user', parts: [{ type: 'text', text: '/config' }] },
                    { id: uid(), role: 'assistant', parts: [{ type: 'text', text: t('app.configSaveFailed', { error: getErrorMessage(error) }), state: 'done' }] }
                ]);
            }
        },
        [refreshProviderList, appendMessages]
    );

    const handleUpdateProvider = useCallback(
        (name: string, updates: Partial<Omit<ProviderConfig, 'name'>> & { newName?: string }) => {
            try {
                updateProvider(name, updates);
                reloadConfig();
                refreshProviderList();
                appendMessages([
                    { id: uid(), role: 'user', parts: [{ type: 'text', text: '/config' }] },
                    { id: uid(), role: 'assistant', parts: [{ type: 'text', text: t('app.providerUpdated', { name: updates.newName ?? name }), state: 'done' }] }
                ]);
            } catch (error) {
                appendMessages([
                    { id: uid(), role: 'user', parts: [{ type: 'text', text: '/config' }] },
                    { id: uid(), role: 'assistant', parts: [{ type: 'text', text: t('app.configSaveFailed', { error: getErrorMessage(error) }), state: 'done' }] }
                ]);
            }
        },
        [refreshProviderList, appendMessages]
    );

    const handleDeleteProvider = useCallback(
        (name: string) => {
            try {
                deleteProvider(name);
                reloadConfig();
                refreshProviderList();
                appendMessages([
                    { id: uid(), role: 'user', parts: [{ type: 'text', text: '/config' }] },
                    { id: uid(), role: 'assistant', parts: [{ type: 'text', text: t('app.providerDeleted', { name }), state: 'done' }] }
                ]);
            } catch (error) {
                appendMessages([
                    { id: uid(), role: 'user', parts: [{ type: 'text', text: '/config' }] },
                    { id: uid(), role: 'assistant', parts: [{ type: 'text', text: t('app.configSaveFailed', { error: getErrorMessage(error) }), state: 'done' }] }
                ]);
            }
        },
        [refreshProviderList, appendMessages]
    );

    const handleSetActiveProvider = useCallback(
        (name: string) => {
            try {
                const providers = getProviders();
                const provider = providers.find((p) => p.name === name);
                if (!provider) throw new Error(t('error.config.providerNotFound', { name }));
                if (provider.models.length === 0) {
                    throw new Error(t('error.config.modelNotFound', { model: '', provider: name }));
                }
                setActiveModel(name, provider.models[0]!);
                reloadConfig();
                refreshProviderList();
                appendMessages([
                    { id: uid(), role: 'user', parts: [{ type: 'text', text: '/config' }] },
                    { id: uid(), role: 'assistant', parts: [{ type: 'text', text: t('app.providerSetActive', { name }), state: 'done' }] }
                ]);
            } catch (error) {
                appendMessages([
                    { id: uid(), role: 'user', parts: [{ type: 'text', text: '/config' }] },
                    { id: uid(), role: 'assistant', parts: [{ type: 'text', text: t('app.configSaveFailed', { error: getErrorMessage(error) }), state: 'done' }] }
                ]);
            }
        },
        [refreshProviderList, appendMessages]
    );

    const handleAddModel = useCallback(
        (providerName: string, modelName: string) => {
            try {
                addModel(providerName, modelName);
                reloadConfig();
                refreshProviderList();
                appendMessages([
                    { id: uid(), role: 'user', parts: [{ type: 'text', text: '/config' }] },
                    { id: uid(), role: 'assistant', parts: [{ type: 'text', text: t('app.modelAdded', { model: modelName, provider: providerName }), state: 'done' }] }
                ]);
            } catch (error) {
                appendMessages([
                    { id: uid(), role: 'user', parts: [{ type: 'text', text: '/config' }] },
                    { id: uid(), role: 'assistant', parts: [{ type: 'text', text: t('app.configSaveFailed', { error: getErrorMessage(error) }), state: 'done' }] }
                ]);
            }
        },
        [refreshProviderList, appendMessages]
    );

    const handleDeleteModel = useCallback(
        (providerName: string, modelName: string) => {
            try {
                deleteModel(providerName, modelName);
                reloadConfig();
                refreshProviderList();
                appendMessages([
                    { id: uid(), role: 'user', parts: [{ type: 'text', text: '/config' }] },
                    { id: uid(), role: 'assistant', parts: [{ type: 'text', text: t('app.modelDeleted', { model: modelName, provider: providerName }), state: 'done' }] }
                ]);
            } catch (error) {
                appendMessages([
                    { id: uid(), role: 'user', parts: [{ type: 'text', text: '/config' }] },
                    { id: uid(), role: 'assistant', parts: [{ type: 'text', text: t('app.configSaveFailed', { error: getErrorMessage(error) }), state: 'done' }] }
                ]);
            }
        },
        [refreshProviderList, appendMessages]
    );

    const handleCancelPicker = useCallback(() => {
        setSessionPicker(null);
        setThemePickerOpen(false);
        setConfigPickerOpen(false);
        setProviderPickerOpen(false);
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
                        },
                        showProviderPicker: () => {
                            refreshProviderList();
                            setProviderPickerOpen(true);
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
            <Header status={status} pendingApproval={pendingApproval !== null} />
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
            <Tips tip={tip} />
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
                onManageProviders={handleManageProviders}
                onBackToConfig={handleBackToConfig}
                providerPickerOpen={providerPickerOpen}
                providerList={providerList}
                activeProviderName={getActiveProviderName()}
                onAddProvider={handleAddProvider}
                onUpdateProvider={handleUpdateProvider}
                onDeleteProvider={handleDeleteProvider}
                onSetActiveProvider={handleSetActiveProvider}
                onAddModel={handleAddModel}
                onDeleteModel={handleDeleteModel}
                onCancelPicker={handleCancelPicker}
            />
            <StatusBar cwd={cwd} modelId={modelId} usage={usage} />
        </Box>
    );
}
