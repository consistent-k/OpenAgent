/**
 * @oagent/channels — Channel 抽象层 SDK
 * 供 OA 主程序和 channel 插件共同使用
 */
export type { Channel, ChannelStatus, ChannelMessageEvent, ChannelStartOpts, RunAgentFn, MessageTransport } from './types';
export { ChannelManager, channelManager } from './manager';
export type { ChannelState } from './manager';
export { SessionManager } from './session';
export { getToolLabel } from './tool-labels';
export { sleep } from './utils';
export { createLogger } from './logger';
export type { ChannelLogger } from './logger';
export { truncate, redactToken, redactBody, redactUrl } from './redact';
export { processMessage } from './process-message';
export type { ProcessMessageParams } from './process-message';
