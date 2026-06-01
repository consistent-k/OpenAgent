/**
 * @oagent/weixin — 微信 Channel 插件
 *
 * 用法:
 *   import { register } from '@oagent/weixin';
 *   register(channelManager, { runAgent });
 */
import type { ChannelManager } from '@oagent/channels';
import { WeixinChannel } from './channel';
import type { RunAgentFn } from './types/plugin';

export interface WeixinPluginOpts {
    /** AI Agent 调用函数 */
    runAgent: RunAgentFn;
}

/**
 * 注册微信 channel 到 ChannelManager
 * 由宿主应用在启动时调用
 */
export function register(manager: ChannelManager, opts: WeixinPluginOpts): void {
    manager.register(new WeixinChannel(opts));
}

// ---------------------------------------------------------------------------
// 内部模块导出（供高级用法或测试使用）
// ---------------------------------------------------------------------------

export { monitorWeixinProvider } from './monitor/main';
export type { WeixinMessageEvent } from './monitor/main';
export { startWeixinLoginWithQr, waitForWeixinLogin, displayQRCode, generateQRCodeText } from './auth/login';
export { resolveWeixinAccount, listIndexedWeixinAccountIds, loadWeixinAccount, saveWeixinAccount, clearWeixinAccount, registerWeixinAccountId, DEFAULT_BASE_URL } from './auth/accounts';
export { clearContextTokensForAccount } from './storage/context-token';
export { sendMessageWeixin } from './messaging/send';
export { WeixinChannel } from './channel';
export type { RunAgentFn } from './types/plugin';
