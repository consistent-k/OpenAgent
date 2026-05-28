import { Box, useApp, useInput } from 'ink';
import React, { useCallback, useState } from 'react';
import { findCommand, COMMANDS, parseCommandInput } from './commands';
import { useChatStream } from './hooks/useChatStream';
import { useFileIndex } from './hooks/useFileIndex';
import { Input } from './ui/chat/Input';
import { PartRenderer } from './ui/messages';
import { MessageList } from './ui/messages/MessageList';
import { Header } from './ui/status/Header';
import { StatusBar } from './ui/status/StatusBar';
import { ThemeProvider, useTheme, type ThemeName } from './ui/text/theme';
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
    const { messages, displayMessages, status, usage, modelId, pendingApproval, send, approvePendingTool, denyPendingTool, selectQuestionOption, appendMessages, setSession, reset, cancel } =
        useChatStream({
            fileIndex,
            cwd
        });

    const [inputValue, setInputValue] = useState('');
    const [showReasoning, setShowReasoning] = useState(false);
    const [sessionPicker, setSessionPicker] = useState<SessionSummary[] | null>(null);
    const [themePickerOpen, setThemePickerOpen] = useState(false);

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

    const handleCancelSession = useCallback(() => {
        setSessionPicker(null);
    }, []);

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

    const handleCancelTheme = useCallback(() => {
        setThemePickerOpen(false);
    }, []);

    useInput((input, key) => {
        if (key.ctrl && input === 'r') {
            setShowReasoning((v) => !v);
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
                if (!cmd) {
                    appendMessages([
                        { id: uid(), role: 'user', parts: [{ type: 'text', text: trimmed }] },
                        { id: uid(), role: 'assistant', parts: [{ type: 'text', text: `未知命令：${trimmed}（输入 /help 查看可用命令）`, state: 'done' }] }
                    ]);
                    return;
                }
                try {
                    await cmd.run({
                        rawInput: trimmed,
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
                        showThemePicker: () => setThemePickerOpen(true)
                    });
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    appendMessages([
                        { id: uid(), role: 'user', parts: [{ type: 'text', text: trimmed }] },
                        { id: uid(), role: 'assistant', parts: [{ type: 'text', text: `[命令错误] ${message}`, state: 'done' }] }
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
            setThemeName
        ]
    );

    return (
        <Box flexDirection="column">
            <Header status={status} fileIndexStatus={fileIndexStatus} fileIndexCount={fileIndex.length} pendingApproval={pendingApproval !== null} />
            {historyMessages.length > 0 && <MessageList messages={historyMessages} showReasoning={showReasoning} />}
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
                onDeny={denyPendingTool}
                onSelectOption={selectQuestionOption}
                sessionPicker={sessionPicker}
                onSelectSession={handleSelectSession}
                onCancelSession={handleCancelSession}
                currentThemeName={themeName}
                themePickerOpen={themePickerOpen}
                onSelectTheme={handleSelectTheme}
                onCancelTheme={handleCancelTheme}
            />
            <StatusBar cwd={cwd} modelId={modelId} usage={usage} />
        </Box>
    );
}
