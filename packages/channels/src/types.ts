/**
 * Channel 接口定义 — 供 OA 主程序和 channel 插件共同使用
 */
import type { ModelMessage } from 'ai';

export type ChannelStatus = 'idle' | 'starting' | 'running' | 'error';

export type ChannelMessageEvent = {
    type: 'inbound' | 'reply' | 'error';
    channelId: string;
    userId: string;
    text: string;
};

export type ChannelStartOpts = {
    abortSignal: AbortSignal;
    onMessage: (event: ChannelMessageEvent) => void;
};

export interface Channel {
    /** 唯一标识符，如 'weixin'、'telegram' */
    readonly id: string;
    /** 显示名称，如 '微信'、'Telegram' */
    readonly name: string;
    /** 当前状态 */
    status: ChannelStatus;
    /** 启动 channel */
    start(opts: ChannelStartOpts): Promise<void>;
    /** 停止 channel */
    stop(): Promise<void>;
    /** 是否已配置（如 token 是否存在） */
    isConfigured(): boolean;
    /** 获取状态描述信息（用于 UI 展示） */
    getStatusInfo(): string[];
    /** 登录（如扫码），可选实现，返回状态信息 */
    login?(onStatus?: (lines: string[]) => void): Promise<string[]>;
    /** 登出/解绑，可选实现，返回状态信息 */
    logout?(): Promise<string[]>;
}

/** runAgent 函数签名 — 由宿主应用注入 */
export type RunAgentFn = (
    messages: ModelMessage[],
    abortSignal?: AbortSignal,
    opts?: { maxRetries?: number }
) => Promise<{
    textStream: AsyncIterable<string>;
    toUIMessageStream: () => AsyncIterable<Record<string, unknown>>;
}>;

/** 消息传输接口 — channel 插件实现，供 processMessage 使用 */
export interface MessageTransport {
    /** 发送文本消息给用户 */
    sendText(userId: string, text: string): Promise<void>;
    /** 发送通知（如工具使用提示、思考中提示） */
    sendNotification(userId: string, text: string): void;
    /** 启动 typing 指示器，返回 stop 函数 */
    startTyping(userId: string, signal?: AbortSignal): Promise<() => void> | (() => void);
}
