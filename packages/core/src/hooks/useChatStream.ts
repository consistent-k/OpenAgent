import { useChat } from '@ai-sdk/react';
import { t } from '@oagent/i18n';
import type { ModelMessage, UIMessage, UIMessageChunk, DynamicToolUIPart, ToolUIPart, ChatTransport } from 'ai';
import { convertToModelMessages, getToolName, isToolUIPart, lastAssistantMessageIsCompleteWithApprovalResponses, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getModelName, getActiveProviderName, isConfigReady } from '../config';
import { runAgent, abortAll } from '../engine';
import { setRetryCallback, clearRetryCallback, type RetryInfo } from '../engine/middleware/retry-notification';
import { setToolApproval } from '../engine/tools/utils/approval-store';
import { extractApiErrorMessage } from '../utils/errors';
import { expandMentions, type FileEntry } from '../utils/files';
import { isTerminalToolState } from '../utils/tool-state';
import { uid } from '../utils/uid';

/** 统一的提示状态 */
export type TipState = { type: 'retry'; info: RetryInfo } | { type: 'error'; message: string } | null;
export type { RetryInfo };

export type ChatStatus = 'idle' | 'streaming' | 'awaiting_approval';

export interface UsageInfo {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
}

export interface PendingToolApproval {
    approvalId: string;
    toolCallId: string;
    toolName: string;
    input: unknown;
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
    tip: TipState;
    send: (text: string) => Promise<void>;
    approvePendingTool: () => Promise<void>;
    alwaysApprovePendingTool: () => Promise<void>;
    denyPendingTool: (reason?: string) => Promise<void>;
    selectQuestionOption: (optionText: string) => Promise<void>;
    appendMessages: (items: UIMessage[]) => void;
    /** 更新指定消息的文本内容（用于子代理流式输出） */
    updateMessageText: (messageId: string, text: string, state?: 'streaming' | 'done') => void;
    setSession: (displayMessages: UIMessage[]) => void;
    reset: () => void;
    cancel: () => void;
}

/** 从 UIMessage 的 tool parts 中提取待审批/待交互信息（只扫描最后一条 assistant 消息） */
function findPendingApproval(messages: UIMessage[]): PendingToolApproval | null {
    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg.role !== 'assistant') continue;
        for (const part of msg.parts) {
            if (!isToolUIPart(part)) continue;
            const toolPart = part as DynamicToolUIPart | ToolUIPart;
            const toolName = getToolName(toolPart);

            // 需要审批的工具（bash、write_file 等）
            if (toolPart.state === 'approval-requested') {
                const approval = (toolPart as { approval?: { id: string } }).approval;
                if (approval?.id) {
                    return {
                        approvalId: approval.id,
                        toolCallId: toolPart.toolCallId,
                        toolName,
                        input: toolPart.input
                    };
                }
            }

            // 无 execute 的客户端工具（ask_user_question），状态为 input-available
            if (toolPart.state === 'input-available' && toolName === 'ask_user_question') {
                return {
                    approvalId: toolPart.toolCallId,
                    toolCallId: toolPart.toolCallId,
                    toolName,
                    input: toolPart.input
                };
            }
        }
        break; // 只扫描最后一条 assistant 消息
    }
    return null;
}

/**
 * 扫描最后一条 assistant 消息的工具状态，返回 { hasActive, allFinished }。
 * hasActive: 是否有正在执行的工具（非终态）
 * allFinished: 所有工具调用是否都已到达终态
 */
function getToolExecutionStatus(messages: UIMessage[]): { hasActive: boolean; allFinished: boolean } {
    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg.role !== 'assistant') continue;
        let hasToolCalls = false;
        let hasActive = false;
        for (const part of msg.parts) {
            if (!isToolUIPart(part)) continue;
            hasToolCalls = true;
            const toolPart = part as DynamicToolUIPart | ToolUIPart;
            if (!isTerminalToolState(toolPart.state)) {
                hasActive = true;
            }
        }
        return { hasActive, allFinished: hasToolCalls && !hasActive };
    }
    return { hasActive: false, allFinished: false };
}

/**
 * 用户主动取消后置 true，阻止 shouldSendAutomatically 再次触发发送。
 * 模块级 ref：useChat 的 sendAutomaticallyWhen 只接受静态谓词，不支持 ref 读取，
 * 因此必须在 predicate 函数体外维护状态。当前仅单一 hook 实例，无跨实例泄漏风险。
 */
const stoppedByUserRef = { current: false };

function shouldSendAutomatically({ messages }: { messages: UIMessage[] }) {
    if (stoppedByUserRef.current) return false;
    return lastAssistantMessageIsCompleteWithToolCalls({ messages }) || lastAssistantMessageIsCompleteWithApprovalResponses({ messages }) || getToolExecutionStatus(messages).allFinished;
}

/** 包装流：跟踪 tool-call 生命周期，流结束时自动补发缺失的 tool-output-error chunk，同时抑制 AI SDK 内部的 console.error */
function patchStuckToolCalls(stream: ReadableStream<UIMessageChunk>): ReadableStream<UIMessageChunk> {
    const pending = new Map<string, { toolName: string; input: unknown; dynamic?: boolean }>();
    let streamError: string | undefined;
    const origError = console.error;
    let errorSuppressed = false;

    const suppressErrors = () => {
        if (!errorSuppressed) {
            console.error = () => {};
            errorSuppressed = true;
        }
    };

    const restoreErrors = () => {
        if (errorSuppressed) {
            console.error = origError;
            errorSuppressed = false;
        }
    };

    return stream.pipeThrough(
        new TransformStream<UIMessageChunk, UIMessageChunk>({
            transform(chunk, controller) {
                suppressErrors();

                if (chunk.type === 'tool-input-start') {
                    pending.set(chunk.toolCallId, { toolName: chunk.toolName, input: '', dynamic: chunk.dynamic });
                }
                if (chunk.type === 'tool-input-delta') {
                    const info = pending.get(chunk.toolCallId);
                    if (info) info.input = (info.input as string) + chunk.inputTextDelta;
                }
                if (chunk.type === 'tool-input-available') {
                    pending.set(chunk.toolCallId, { toolName: chunk.toolName, input: chunk.input, dynamic: chunk.dynamic });
                }
                if (
                    chunk.type === 'tool-output-available' ||
                    chunk.type === 'tool-output-error' ||
                    chunk.type === 'tool-output-denied' ||
                    chunk.type === 'tool-input-error' ||
                    chunk.type === 'tool-approval-request'
                ) {
                    pending.delete(chunk.toolCallId);
                }
                // 捕获流中的错误信息，用于补发给 stuck tool calls
                if (chunk.type === 'error' && 'errorText' in chunk) {
                    streamError = chunk.errorText as string;
                }

                controller.enqueue(chunk);
            },
            flush(controller) {
                try {
                    const baseMsg = streamError ? `${t('error.streamInterrupted')} — ${streamError}` : t('error.streamInterrupted');
                    for (const [toolCallId, info] of pending) {
                        controller.enqueue({
                            type: 'tool-output-error',
                            toolCallId,
                            errorText: baseMsg,
                            dynamic: info.dynamic
                        } as UIMessageChunk);
                    }
                } finally {
                    restoreErrors();
                }
            },
            cancel() {
                restoreErrors();
            }
        })
    );
}

export function useChatStream({ fileIndex, cwd }: UseChatStreamOptions): UseChatStreamResult {
    const usageRef = useRef<UsageInfo | null>(null);
    const [usage, setUsage] = useState<UsageInfo | null>(null);
    const providerName = getActiveProviderName();
    const modelName = getModelName();
    const modelId = providerName && modelName ? `${providerName}/${modelName}` : modelName;
    const [tip, setTip] = useState<TipState>(null);

    // Transport is stable — reads agent lazily from ref each call
    const transport = useMemo<ChatTransport<UIMessage>>(
        () => ({
            async sendMessages({ messages, abortSignal }) {
                // 设置重试通知回调
                setRetryCallback((info) => setTip({ type: 'retry', info }));

                const modelMessage = await convertToModelMessages(messages);
                const result = await runAgent(modelMessage, abortSignal);

                // 获取 usage 信息（不阻塞流，totalUsage 在流消费完毕后自动 resolve）
                result.totalUsage.then(
                    (totalUsage) => {
                        if (totalUsage) {
                            const info: UsageInfo = {
                                inputTokens: totalUsage.inputTokens ?? 0,
                                outputTokens: totalUsage.outputTokens ?? 0,
                                totalTokens: totalUsage.totalTokens ?? 0
                            };
                            usageRef.current = info;
                            setUsage(info);
                        }
                    },
                    () => {
                        // ignore usage errors
                    }
                );

                const stream = result.toUIMessageStream({
                    onError: (error) => extractApiErrorMessage(error)
                }) as ReadableStream<UIMessageChunk>;
                return patchStuckToolCalls(stream);
            },
            async reconnectToStream() {
                return null;
            }
        }),
        []
    );

    const {
        messages: displayMessages,
        status: chatStatus,
        error,
        sendMessage,
        stop,
        setMessages,
        addToolApprovalResponse,
        addToolOutput
    } = useChat({
        transport,
        sendAutomaticallyWhen: shouldSendAutomatically
    });

    // --- 派生状态 ---

    const pendingApproval = useMemo(() => findPendingApproval(displayMessages), [displayMessages]);

    const status: ChatStatus = useMemo(() => {
        if (pendingApproval) return 'awaiting_approval';
        if (chatStatus === 'submitted' || chatStatus === 'streaming') return 'streaming';
        // 工具执行中（如子代理运行）也视为 streaming，允许 ESC/Ctrl+C 取消
        if (getToolExecutionStatus(displayMessages).hasActive) return 'streaming';
        return 'idle';
    }, [chatStatus, pendingApproval, displayMessages]);

    const [messages, setModelMessages] = useState<ModelMessage[]>([]);
    // 流结束后：同步 model messages、清除重试回调、更新 tip
    useEffect(() => {
        if (chatStatus !== 'ready') return;
        clearRetryCallback();
        if (error) {
            setTip({ type: 'error', message: error.message });
        } else {
            setTip(null);
        }
        convertToModelMessages(displayMessages)
            .then(setModelMessages)
            .catch(() => setModelMessages([]));
    }, [chatStatus, displayMessages, error]);

    // unmount 时清除全局回调
    useEffect(() => () => clearRetryCallback(), []);

    // --- 方法 ---

    const send = useCallback(
        async (text: string) => {
            stoppedByUserRef.current = false;
            if (!isConfigReady()) {
                setMessages((prev) => [
                    ...prev,
                    { id: uid(), role: 'user', parts: [{ type: 'text', text }] },
                    {
                        id: uid(),
                        role: 'assistant',
                        parts: [{ type: 'text', text: t('error.configNotReady') }]
                    }
                ]);
                return;
            }
            setTip(null);
            const expandedText = await expandMentions(text, fileIndex, cwd);
            sendMessage({ text: expandedText });
        },
        [fileIndex, cwd, sendMessage, setMessages]
    );

    const approvePendingTool = useCallback(async () => {
        if (!pendingApproval) return;
        try {
            await addToolApprovalResponse({
                id: pendingApproval.approvalId,
                approved: true
            });
        } catch {
            // stream may have ended
        }
    }, [pendingApproval, addToolApprovalResponse]);

    const alwaysApprovePendingTool = useCallback(async () => {
        if (!pendingApproval) return;
        setToolApproval(pendingApproval.toolName, true);
        try {
            await addToolApprovalResponse({
                id: pendingApproval.approvalId,
                approved: true
            });
        } catch {
            // stream may have ended
        }
    }, [pendingApproval, addToolApprovalResponse]);

    const denyPendingTool = useCallback(
        async (reason = t('error.userDeniedTool')) => {
            if (!pendingApproval) return;
            try {
                await addToolApprovalResponse({
                    id: pendingApproval.approvalId,
                    approved: false,
                    reason
                });
            } catch {
                // stream may have ended
            }
        },
        [pendingApproval, addToolApprovalResponse]
    );

    const selectQuestionOption = useCallback(
        async (optionText: string) => {
            if (!pendingApproval) return;
            addToolOutput({
                tool: 'ask_user_question',
                toolCallId: pendingApproval.toolCallId,
                output: { selected: optionText }
            });
        },
        [pendingApproval, addToolOutput]
    );

    const appendMessages = useCallback(
        (items: UIMessage[]) => {
            setMessages((prev) => [...prev, ...items]);
        },
        [setMessages]
    );

    const updateMessageText = useCallback(
        (messageId: string, text: string, state: 'streaming' | 'done' = 'done') => {
            setMessages((prev) =>
                prev.map((msg) => {
                    if (msg.id !== messageId) return msg;
                    return {
                        ...msg,
                        parts: msg.parts.map((part) => (part.type === 'text' ? { ...part, text, state } : part))
                    };
                })
            );
        },
        [setMessages]
    );

    const setSessionFn = useCallback(
        (displayMessages: UIMessage[]) => {
            setMessages(displayMessages);
        },
        [setMessages]
    );

    const reset = useCallback(() => {
        stop();
        setMessages([]);
        setTip(null);
    }, [stop, setMessages]);

    const cancel = useCallback(() => {
        stoppedByUserRef.current = true;
        abortAll();
        stop();
    }, [stop]);

    return {
        messages,
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
        updateMessageText,
        setSession: setSessionFn,
        reset,
        cancel
    };
}
