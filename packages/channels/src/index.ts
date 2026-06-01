/**
 * @oagent/channels — Channel 抽象层 SDK
 * 供 OA 主程序和 channel 插件共同使用
 */
export type { Channel, ChannelStatus, ChannelMessageEvent, ChannelStartOpts } from './types';
export { ChannelManager, channelManager } from './manager';
export type { ChannelState } from './manager';
export { SessionManager } from './session';
