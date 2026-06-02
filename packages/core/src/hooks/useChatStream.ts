import type { ModelMessage } from 'ai';
import type { UIMessage, TextUIPart, ReasoningUIPart, DynamicToolUIPart, FileUIPart } from 'ai';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getModelName, isConfigReady } from '../config';
import { expandMentions, type FileEntry } from '../utils/files';
import { uid } from '../utils/uid';
import { runAgent } from '@/engine';
import { setToolApproval } from '@/engine/tools/utils/approval-store';

export type ChatStatus = 'idle' | 'streaming' | 'awaiting_approval';

type AssistantPart = TextUIPart | ReasoningUIPart | DynamicToolUIPart | FileUIPart;

export interface UsageInfo {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
}

interface UseChatStreamOptions {
    fileIndex: FileEntry[];
    cwd: string;
}

interface UseChatStreamResult {
    messages: ModelMessage[];
    displayMessages: UIMessage[];
    status: ChatStatus;
    usage: UsageInfo | null;
    modelId: string;
    pendingApproval: PendingToolApproval | null;
    send: (text: string) => Promise<void>;
    approvePendingTool: () => Promise<void>;
    alwaysApprovePendingTool: () => Promise<void>;
    denyPendingTool: (reason?: string) => Promise<void>;
    selectQuestionOption: (optionText: string) => Promise<void>;
    appendMessages: (items: UIMessage[]) => void;
    setSession: (messages: ModelMessage[], displayMessages: UIMessage[]) => void;
    reset: () => void;
    cancel: () => void;
}

export interface PendingToolApproval {
    approvalId: string;
    toolCallId: string;
    toolName: string;
    input: unknown;
}

function updateLastAssistant(prev: UIMessage[], updater: (parts: AssistantPart[]) => AssistantPart[]): UIMessage[] {
    const last = prev[prev.length - 1];
    if (!last || last.role !== 'assistant') return prev;
    return [...prev.slice(0, -1), { ...last, parts: updater(last.parts as AssistantPart[]) }];
}

export function useChatStream({ fileIndex, cwd }: UseChatStreamOptions): UseChatStreamResult {
    const [messages, setMessages] = useState<ModelMessage[]>([]);
    const [displayMessages, setDisplayMessages] = useState<UIMessage[]>([]);
    const [status, setStatus] = useState<ChatStatus>('idle');
    const [pendingApproval, setPendingApproval] = useState<PendingToolApproval | null>(null);
    const [usage, setUsage] = useState<UsageInfo | null>(null);
    const [modelId, setModelId] = useState(getModelName());
    const messagesRef = useRef<ModelMessage[]>([]);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    const appendMessages = useCallback((items: UIMessage[]) => {
        setDisplayMessages((prev) => [...prev, ...items]);
    }, []);

    const reset = useCallback(() => {
        abortControllerRef.current?.abort('会话已清空');
        abortControllerRef.current = null;
        messagesRef.current = [];
        setPendingApproval(null);
        setMessages([]);
        setDisplayMessages([]);
    }, []);

    const streamMessages = useCallback(async (nextMessages: ModelMessage[]) => {
        const abortController = new AbortController();
        abortControllerRef.current = abortController;
        setStatus('streaming');

        try {
            const result = await runAgent(nextMessages, abortController.signal);
            const uiStream = result.toUIMessageStream();

            for await (const chunk of uiStream) {
                switch (chunk.type) {
                    case 'text-start': {
                        setDisplayMessages((prev) => updateLastAssistant(prev, (parts) => [...parts, { type: 'text' as const, text: '', state: 'streaming' as const }]));
                        break;
                    }
                    case 'text-delta': {
                        setDisplayMessages((prev) =>
                            updateLastAssistant(prev, (parts) => {
                                const last = parts[parts.length - 1];
                                if (!last || last.type !== 'text') return parts;
                                const updated: TextUIPart = { ...last, text: last.text + chunk.delta };
                                return [...parts.slice(0, -1), updated];
                            })
                        );
                        break;
                    }
                    case 'text-end': {
                        setDisplayMessages((prev) =>
                            updateLastAssistant(prev, (parts) => {
                                const last = parts[parts.length - 1];
                                if (!last || last.type !== 'text') return parts;
                                return [...parts.slice(0, -1), { ...last, state: 'done' as const }];
                            })
                        );
                        break;
                    }
                    case 'reasoning-start': {
                        setDisplayMessages((prev) => updateLastAssistant(prev, (parts) => [...parts, { type: 'reasoning' as const, text: '', state: 'streaming' as const }]));
                        break;
                    }
                    case 'reasoning-delta': {
                        setDisplayMessages((prev) =>
                            updateLastAssistant(prev, (parts) => {
                                const last = parts[parts.length - 1];
                                if (!last || last.type !== 'reasoning') return parts;
                                const updated: ReasoningUIPart = { ...last, text: last.text + chunk.delta };
                                return [...parts.slice(0, -1), updated];
                            })
                        );
                        break;
                    }
                    case 'reasoning-end': {
                        setDisplayMessages((prev) =>
                            updateLastAssistant(prev, (parts) => {
                                const last = parts[parts.length - 1];
                                if (!last || last.type !== 'reasoning') return parts;
                                return [...parts.slice(0, -1), { ...last, state: 'done' as const }];
                            })
                        );
                        break;
                    }
                    case 'tool-input-start': {
                        setDisplayMessages((prev) =>
                            updateLastAssistant(prev, (parts) => [
                                ...parts,
                                {
                                    type: 'dynamic-tool' as const,
                                    toolName: chunk.toolName,
                                    toolCallId: chunk.toolCallId,
                                    state: 'input-streaming' as const,
                                    input: '',
                                    ...(chunk.title != null ? { title: chunk.title } : {}),
                                    ...(chunk.toolMetadata != null ? { toolMetadata: chunk.toolMetadata } : {}),
                                    ...(chunk.providerExecuted != null ? { providerExecuted: chunk.providerExecuted } : {})
                                } as DynamicToolUIPart
                            ])
                        );
                        break;
                    }
                    case 'tool-input-delta': {
                        setDisplayMessages((prev) =>
                            updateLastAssistant(prev, (parts) => {
                                const idx = parts.findIndex((p): p is DynamicToolUIPart => p.type === 'dynamic-tool' && p.toolCallId === chunk.toolCallId);
                                if (idx === -1) return parts;
                                const existing = parts[idx] as DynamicToolUIPart;
                                const updated: DynamicToolUIPart = {
                                    ...existing,
                                    input: ((existing.input as string) || '') + chunk.inputTextDelta
                                };
                                return [...parts.slice(0, idx), updated, ...parts.slice(idx + 1)];
                            })
                        );
                        break;
                    }
                    case 'tool-input-available': {
                        setDisplayMessages((prev) =>
                            updateLastAssistant(prev, (parts) => {
                                const idx = parts.findIndex((p): p is DynamicToolUIPart => p.type === 'dynamic-tool' && p.toolCallId === chunk.toolCallId);
                                if (idx === -1) {
                                    return [
                                        ...parts,
                                        {
                                            type: 'dynamic-tool' as const,
                                            toolName: chunk.toolName,
                                            toolCallId: chunk.toolCallId,
                                            state: 'input-available' as const,
                                            input: chunk.input,
                                            ...(chunk.dynamic != null ? { dynamic: chunk.dynamic } : {}),
                                            ...(chunk.title != null ? { title: chunk.title } : {})
                                        } as DynamicToolUIPart
                                    ];
                                }
                                const existing = parts[idx] as DynamicToolUIPart;
                                const updated = {
                                    type: 'dynamic-tool' as const,
                                    toolName: existing.toolName,
                                    toolCallId: existing.toolCallId,
                                    state: 'input-available' as const,
                                    input: chunk.input,
                                    ...(existing.title != null ? { title: existing.title } : {}),
                                    ...(existing.toolMetadata != null ? { toolMetadata: existing.toolMetadata } : {}),
                                    ...(existing.providerExecuted != null ? { providerExecuted: existing.providerExecuted } : {}),
                                    ...(chunk.dynamic != null ? { dynamic: chunk.dynamic } : {}),
                                    ...(chunk.title != null ? { title: chunk.title } : {})
                                } as DynamicToolUIPart;
                                return [...parts.slice(0, idx), updated, ...parts.slice(idx + 1)];
                            })
                        );
                        break;
                    }
                    case 'tool-approval-request': {
                        setStatus('awaiting_approval');
                        setDisplayMessages((prev) => {
                            const updated = updateLastAssistant(prev, (parts) => {
                                const tool = parts.findIndex((p): p is DynamicToolUIPart => p.type === 'dynamic-tool' && p.toolCallId === chunk.toolCallId);
                                if (tool === -1) return parts;
                                const existing = parts[tool] as DynamicToolUIPart;
                                const updated = {
                                    type: 'dynamic-tool' as const,
                                    toolName: existing.toolName,
                                    toolCallId: existing.toolCallId,
                                    state: 'approval-requested' as const,
                                    input: existing.input,
                                    title: existing.title,
                                    toolMetadata: existing.toolMetadata,
                                    providerExecuted: existing.providerExecuted,
                                    approval: { id: chunk.approvalId }
                                } as DynamicToolUIPart;
                                return [...parts.slice(0, tool), updated, ...parts.slice(tool + 1)];
                            });
                            // 从更新后的 parts 中查找 toolName 和 input
                            const last = updated[updated.length - 1];
                            if (last && last.role === 'assistant') {
                                const toolPart = (last.parts as AssistantPart[]).find((p): p is DynamicToolUIPart => p.type === 'dynamic-tool' && p.toolCallId === chunk.toolCallId);
                                if (toolPart) {
                                    setPendingApproval({
                                        approvalId: chunk.approvalId,
                                        toolCallId: chunk.toolCallId,
                                        toolName: toolPart.toolName,
                                        input: toolPart.input
                                    });
                                }
                            }
                            return updated;
                        });
                        break;
                    }
                    case 'tool-output-available': {
                        setDisplayMessages((prev) =>
                            updateLastAssistant(prev, (parts) => {
                                const idx = parts.findIndex((p): p is DynamicToolUIPart => p.type === 'dynamic-tool' && p.toolCallId === chunk.toolCallId);
                                if (idx === -1) return parts;
                                const existing = parts[idx] as DynamicToolUIPart;
                                const existingApproval = (existing as DynamicToolUIPart & { approval?: { id: string } }).approval;
                                const updated = {
                                    type: 'dynamic-tool' as const,
                                    toolName: existing.toolName,
                                    toolCallId: existing.toolCallId,
                                    state: 'output-available' as const,
                                    input: existing.input,
                                    output: chunk.output,
                                    title: existing.title,
                                    toolMetadata: existing.toolMetadata,
                                    providerExecuted: existing.providerExecuted,
                                    ...(existingApproval ? { approval: { ...existingApproval, approved: true as const } } : {})
                                } as DynamicToolUIPart;
                                return [...parts.slice(0, idx), updated, ...parts.slice(idx + 1)];
                            })
                        );
                        break;
                    }
                    case 'tool-input-error': {
                        setDisplayMessages((prev) =>
                            updateLastAssistant(prev, (parts) => {
                                const idx = parts.findIndex((p): p is DynamicToolUIPart => p.type === 'dynamic-tool' && p.toolCallId === chunk.toolCallId);
                                if (idx === -1) return parts;
                                const existing = parts[idx] as DynamicToolUIPart;
                                const existingApproval = (existing as DynamicToolUIPart & { approval?: { id: string } }).approval;
                                const updated = {
                                    type: 'dynamic-tool' as const,
                                    toolName: existing.toolName,
                                    toolCallId: existing.toolCallId,
                                    state: 'output-error' as const,
                                    input: existing.input,
                                    errorText: chunk.errorText,
                                    title: existing.title,
                                    toolMetadata: existing.toolMetadata,
                                    providerExecuted: existing.providerExecuted,
                                    ...(existingApproval ? { approval: { ...existingApproval, approved: true as const } } : {})
                                } as DynamicToolUIPart;
                                return [...parts.slice(0, idx), updated, ...parts.slice(idx + 1)];
                            })
                        );
                        break;
                    }
                    case 'tool-output-error': {
                        setDisplayMessages((prev) =>
                            updateLastAssistant(prev, (parts) => {
                                const idx = parts.findIndex((p): p is DynamicToolUIPart => p.type === 'dynamic-tool' && p.toolCallId === chunk.toolCallId);
                                if (idx === -1) return parts;
                                const existing = parts[idx] as DynamicToolUIPart;
                                const existingApproval = (existing as DynamicToolUIPart & { approval?: { id: string } }).approval;
                                const updated = {
                                    type: 'dynamic-tool' as const,
                                    toolName: existing.toolName,
                                    toolCallId: existing.toolCallId,
                                    state: 'output-error' as const,
                                    input: existing.input,
                                    errorText: chunk.errorText,
                                    title: existing.title,
                                    toolMetadata: existing.toolMetadata,
                                    providerExecuted: existing.providerExecuted,
                                    ...(existingApproval ? { approval: { ...existingApproval, approved: true as const } } : {})
                                } as DynamicToolUIPart;
                                return [...parts.slice(0, idx), updated, ...parts.slice(idx + 1)];
                            })
                        );
                        break;
                    }
                    case 'tool-output-denied': {
                        setDisplayMessages((prev) =>
                            updateLastAssistant(prev, (parts) => {
                                const idx = parts.findIndex((p): p is DynamicToolUIPart => p.type === 'dynamic-tool' && p.toolCallId === chunk.toolCallId);
                                if (idx === -1) return parts;
                                const existing = parts[idx] as DynamicToolUIPart & {
                                    approval?: { id: string };
                                };
                                const approvalId = existing.approval?.id || '';
                                const updated = {
                                    type: 'dynamic-tool' as const,
                                    toolName: existing.toolName,
                                    toolCallId: existing.toolCallId,
                                    state: 'output-denied' as const,
                                    input: existing.input,
                                    title: existing.title,
                                    toolMetadata: existing.toolMetadata,
                                    providerExecuted: existing.providerExecuted,
                                    approval: { id: approvalId, approved: false as const }
                                } as DynamicToolUIPart;
                                return [...parts.slice(0, idx), updated, ...parts.slice(idx + 1)];
                            })
                        );
                        break;
                    }
                    case 'file': {
                        setDisplayMessages((prev) => updateLastAssistant(prev, (parts) => [...parts, { type: 'file' as const, mediaType: chunk.mediaType, url: chunk.url }]));
                        break;
                    }
                    case 'error': {
                        setDisplayMessages((prev) => {
                            const last = prev[prev.length - 1];
                            if (!last || last.role !== 'assistant') return prev;
                            return [
                                ...prev.slice(0, -1),
                                {
                                    ...last,
                                    parts: [...(last.parts as AssistantPart[]), { type: 'text' as const, text: `[错误] ${chunk.errorText}`, state: 'done' as const }]
                                }
                            ];
                        });
                        break;
                    }
                }
            }

            const responseMeta = await result.response;
            const responseMessages = responseMeta.messages as ModelMessage[];
            const completedMessages = [...messagesRef.current, ...responseMessages];
            messagesRef.current = completedMessages;
            setMessages(completedMessages);
            setModelId(responseMeta.modelId);

            const totalUsage = await result.totalUsage;
            if (totalUsage) {
                setUsage({
                    inputTokens: totalUsage.inputTokens ?? 0,
                    outputTokens: totalUsage.outputTokens ?? 0,
                    totalTokens: totalUsage.totalTokens ?? 0
                });
            }
        } catch (err) {
            if (abortController.signal.aborted) {
                setDisplayMessages((prev) => {
                    const last = prev[prev.length - 1];
                    if (!last || last.role !== 'assistant') return prev;
                    return [
                        ...prev.slice(0, -1),
                        {
                            ...last,
                            parts: [...(last.parts as AssistantPart[]), { type: 'text' as const, text: '[已取消] 本次回复已停止。', state: 'done' as const }]
                        }
                    ];
                });
                return;
            }
            setDisplayMessages((prev) => {
                const last = prev[prev.length - 1];
                if (!last || last.role !== 'assistant') return prev;
                return [
                    ...prev.slice(0, -1),
                    {
                        ...last,
                        parts: [...(last.parts as AssistantPart[]), { type: 'text' as const, text: `[错误] ${err instanceof Error ? err.message : String(err)}`, state: 'done' as const }]
                    }
                ];
            });
        } finally {
            if (abortControllerRef.current === abortController) {
                abortControllerRef.current = null;
            }
            setStatus('idle');
        }
    }, []);

    const send = useCallback(
        async (text: string) => {
            if (!isConfigReady()) {
                setDisplayMessages((prev) => [
                    ...prev,
                    { id: uid(), role: 'user', parts: [{ type: 'text', text }] },
                    { id: uid(), role: 'assistant', parts: [{ type: 'text' as const, text: '⚠️ 配置未完善，请先输入 /config 配置 baseUrl、apiKey、model', state: 'done' as const }] }
                ]);
                return;
            }
            setDisplayMessages((prev) => [...prev, { id: uid(), role: 'user', parts: [{ type: 'text', text }] }, { id: uid(), role: 'assistant', parts: [] }]);
            const expandedText = await expandMentions(text, fileIndex, cwd);
            const nonSystem = messagesRef.current.filter((m) => m.role !== 'system');
            const newMessages: ModelMessage[] = [...nonSystem, { role: 'user', content: expandedText }];
            messagesRef.current = newMessages;
            setPendingApproval(null);
            setMessages(newMessages);
            await streamMessages(newMessages);
        },
        [fileIndex, cwd, streamMessages]
    );

    const approvePendingTool = useCallback(async () => {
        if (!pendingApproval) return;
        const approvalMessage = {
            role: 'tool',
            content: [
                {
                    type: 'tool-approval-response',
                    approvalId: pendingApproval.approvalId,
                    approved: true
                }
            ]
        } as ModelMessage;
        const nextMessages = [...messagesRef.current, approvalMessage];
        messagesRef.current = nextMessages;
        setMessages(nextMessages);
        setPendingApproval(null);
        setDisplayMessages((prev) =>
            updateLastAssistant(prev, (parts) => {
                const idx = parts.findIndex((p): p is DynamicToolUIPart => p.type === 'dynamic-tool' && p.toolCallId === pendingApproval.toolCallId);
                if (idx === -1) return parts;
                const existing = parts[idx] as DynamicToolUIPart;
                return [
                    ...parts.slice(0, idx),
                    {
                        ...existing,
                        state: 'approval-responded' as const,
                        approval: { id: pendingApproval.approvalId, approved: true as const }
                    } as DynamicToolUIPart,
                    ...parts.slice(idx + 1)
                ];
            })
        );
        setDisplayMessages((prev) => [...prev, { id: uid(), role: 'assistant', parts: [] }]);
        await streamMessages(nextMessages);
    }, [pendingApproval, streamMessages]);

    const alwaysApprovePendingTool = useCallback(async () => {
        if (!pendingApproval) return;
        setToolApproval(pendingApproval.toolName, true);
        const approvalMessage = {
            role: 'tool',
            content: [
                {
                    type: 'tool-approval-response',
                    approvalId: pendingApproval.approvalId,
                    approved: true
                }
            ]
        } as ModelMessage;
        const nextMessages = [...messagesRef.current, approvalMessage];
        messagesRef.current = nextMessages;
        setMessages(nextMessages);
        setPendingApproval(null);
        setDisplayMessages((prev) =>
            updateLastAssistant(prev, (parts) => {
                const idx = parts.findIndex((p): p is DynamicToolUIPart => p.type === 'dynamic-tool' && p.toolCallId === pendingApproval.toolCallId);
                if (idx === -1) return parts;
                const existing = parts[idx] as DynamicToolUIPart;
                return [
                    ...parts.slice(0, idx),
                    {
                        ...existing,
                        state: 'approval-responded' as const,
                        approval: { id: pendingApproval.approvalId, approved: true as const }
                    } as DynamicToolUIPart,
                    ...parts.slice(idx + 1)
                ];
            })
        );
        setDisplayMessages((prev) => [...prev, { id: uid(), role: 'assistant', parts: [] }]);
        await streamMessages(nextMessages);
    }, [pendingApproval, streamMessages]);

    const denyPendingTool = useCallback(
        async (reason = '用户拒绝执行该工具') => {
            if (!pendingApproval) return;
            const approvalMessage = {
                role: 'tool',
                content: [
                    {
                        type: 'tool-approval-response',
                        approvalId: pendingApproval.approvalId,
                        approved: false,
                        reason
                    }
                ]
            } as ModelMessage;
            const nextMessages = [...messagesRef.current, approvalMessage];
            messagesRef.current = nextMessages;
            setMessages(nextMessages);
            setPendingApproval(null);
            setDisplayMessages((prev) =>
                updateLastAssistant(prev, (parts) => {
                    const idx = parts.findIndex((p): p is DynamicToolUIPart => p.type === 'dynamic-tool' && p.toolCallId === pendingApproval.toolCallId);
                    if (idx === -1) return parts;
                    const existing = parts[idx] as DynamicToolUIPart;
                    return [
                        ...parts.slice(0, idx),
                        {
                            ...existing,
                            state: 'output-denied' as const,
                            approval: { id: pendingApproval.approvalId, approved: false as const, reason }
                        } as DynamicToolUIPart,
                        ...parts.slice(idx + 1)
                    ];
                })
            );
            setDisplayMessages((prev) => [...prev, { id: uid(), role: 'assistant', parts: [] }]);
            await streamMessages(nextMessages);
        },
        [pendingApproval, streamMessages]
    );

    const selectQuestionOption = useCallback(
        async (optionText: string) => {
            if (!pendingApproval) return;
            const toolResultMessage = {
                role: 'tool',
                content: [
                    {
                        type: 'tool-result',
                        toolCallId: pendingApproval.toolCallId,
                        toolName: pendingApproval.toolName,
                        output: { type: 'json', value: { selected: optionText } }
                    }
                ]
            } as ModelMessage;
            const nextMessages = [...messagesRef.current, toolResultMessage];
            messagesRef.current = nextMessages;
            setMessages(nextMessages);
            setPendingApproval(null);
            setDisplayMessages((prev) =>
                updateLastAssistant(prev, (parts) => {
                    const idx = parts.findIndex((p): p is DynamicToolUIPart => p.type === 'dynamic-tool' && p.toolCallId === pendingApproval.toolCallId);
                    if (idx === -1) return parts;
                    const existing = parts[idx] as DynamicToolUIPart;
                    return [
                        ...parts.slice(0, idx),
                        {
                            ...existing,
                            state: 'output-available' as const,
                            input: { ...((existing.input as Record<string, unknown>) || {}), _selectedOption: optionText },
                            output: JSON.stringify({ selected: optionText })
                        } as DynamicToolUIPart,
                        ...parts.slice(idx + 1)
                    ];
                })
            );
            setDisplayMessages((prev) => [...prev, { id: uid(), role: 'assistant', parts: [] }]);
            await streamMessages(nextMessages);
        },
        [pendingApproval, streamMessages]
    );

    const setSession = useCallback((nextMessages: ModelMessage[], nextDisplayMessages: UIMessage[]) => {
        messagesRef.current = nextMessages;
        setMessages(nextMessages);
        setDisplayMessages(nextDisplayMessages);
        setPendingApproval(null);
    }, []);

    const cancel = useCallback(() => {
        abortControllerRef.current?.abort('用户取消');
    }, []);

    return {
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
    };
}
