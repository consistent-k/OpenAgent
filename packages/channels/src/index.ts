/**
 * @oagent/channels — Channel 抽象层 SDK
 * 供 OA 主程序和 channel 插件共同使用
 */
export type { Channel, ChannelStatus, ChannelMessageEvent, ChannelStartOpts } from './types.js';
export { ChannelManager, channelManager } from './manager.js';
export type { ChannelState } from './manager.js';
export { SessionManager } from './session.js';
