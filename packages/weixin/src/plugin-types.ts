/**
 * @oagent/weixin 内部类型定义
 */
import type { ModelMessage } from 'ai';

/** runAgent 函数签名 — 由宿主应用注入 */
export type RunAgentFn = (messages: ModelMessage[], abortSignal?: AbortSignal, opts?: { maxRetries?: number }) => Promise<{ textStream: AsyncIterable<string> }>;

/** 工具自动审批回调 — 由宿主应用注入 */
export type EnableAutoApproveFn = () => Promise<void>;
