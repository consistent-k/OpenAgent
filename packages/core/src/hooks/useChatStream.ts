import { useChat } from '@ai-sdk/react';
import { t } from '@oagent/i18n';
import type { ModelMessage, UIMessage, UIMessageChunk, DynamicToolUIPart, ToolUIPart, ChatTransport } from 'ai';
import { convertToModelMessages, getToolName, isToolUIPart, lastAssistantMessageIsCompleteWithApprovalResponses, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getModelName, getActiveProviderName, isConfigReady } from '../config';
import { runAgent } from '../engine';
import { setRetryCallback, clearRetryCallback, type RetryInfo } from '../engine/middleware/retry-notification';
import { setToolApproval } from '../engine/tools/utils/approval-store';
import { extractApiErrorMessage } from '../utils/errors';
import { expandMentions, type FileEntry } from '../utils/files';
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

/** sendAutomaticallyWhen 回调（无闭包依赖，提取为模块级函数避免每次渲染重建） */
function shouldSendAutomatically({ messages }: { messages: UIMessage[] }) {
    return lastAssistantMessageIsCompleteWithToolCalls({ messages }) || lastAssistantMessageIsCompleteWithApprovalResponses({ messages });
}

/** 包装流：跟踪 tool-call 生命周期，流结束时自动补发缺失的 tool-output-error chunk，同时抑制 AI SDK 内部的 console.error */
function patchStuckToolCalls(stream: ReadableStream<UIMessageChunk>): ReadableStream<UIMessageChunk> {
    const pending = new Map<string, { toolName: string; input: unknown; dynamic?: boolean }>();
    let streamError: string | undefined;
    const origError = console.error;

    return stream.pipeThrough(
        new TransformStream<UIMessageChunk, UIMessageChunk>({
            transform(chunk, controller) {
                // 抑制 AI SDK 内部的 console.error
                console.error = () => {};

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
                const baseMsg = streamError ? `${t('error.streamInterrupted')} — ${streamError}` : t('error.streamInterrupted');
                for (const [toolCallId, info] of pending) {
                    controller.enqueue({
                        type: 'tool-output-error',
                        toolCallId,
                        errorText: baseMsg,
                        dynamic: info.dynamic
                    } as UIMessageChunk);
                }
                console.error = origError;
            }
        })
    );
}

export function useChatStream({ fileIndex, cwd }: UseChatStreamOptions): UseChatStreamResult {
    const usageRef = useRef<UsageInfo | null>(null);
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
                            usageRef.current = {
                                inputTokens: totalUsage.inputTokens ?? 0,
                                outputTokens: totalUsage.outputTokens ?? 0,
                                totalTokens: totalUsage.totalTokens ?? 0
                            };
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
        return 'idle';
    }, [chatStatus, pendingApproval]);

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

    const usage = usageRef.current;

    // --- 方法 ---

    const send = useCallback(
        async (text: string) => {
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
        setSession: setSessionFn,
        reset,
        cancel
    };
}
