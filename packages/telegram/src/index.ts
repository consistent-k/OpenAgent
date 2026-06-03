/**
 * @oagent/telegram — Telegram Channel 插件
 *
 * 用法:
 *   import { register } from '@oagent/telegram';
 *   register(channelManager, { runAgent });
 */
import type { ChannelManager } from '@oagent/channels';
import { TelegramChannel } from './channel';
import type { RunAgentFn } from './types/plugin';

export interface TelegramPluginOpts {
    /** AI Agent 调用函数 */
    runAgent: RunAgentFn;
}

/**
 * 注册 Telegram channel 到 ChannelManager
 * 由宿主应用在启动时调用
 */
export function register(manager: ChannelManager, opts: TelegramPluginOpts): void {
    manager.register(new TelegramChannel(opts));
}

// ---------------------------------------------------------------------------
// 内部模块导出（供高级用法或测试使用）
// ---------------------------------------------------------------------------

export { monitorTelegramProvider } from './monitor/main';
export type { TelegramMessageEvent } from './monitor/main';
export { loadAccount, saveAccount, clearAccount, hasAccount } from './storage/accounts';
export { TelegramChannel } from './channel';
export type { RunAgentFn } from './types/plugin';
