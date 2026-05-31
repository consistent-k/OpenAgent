/**
 * @oagent/weixin — 微信 Channel 插件
 *
 * 用法:
 *   import { register } from '@oagent/weixin';
 *   register(channelManager, { runAgent });
 */
import type { ChannelManager } from '@oagent/channels';
import { WeixinChannel } from './channel.js';
import type { RunAgentFn, EnableAutoApproveFn } from './plugin-types.js';

export interface WeixinPluginOpts {
    /** AI Agent 调用函数 */
    runAgent: RunAgentFn;
    /** 工具自动审批函数 */
    enableAutoApprove?: EnableAutoApproveFn;
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

export { monitorWeixinProvider } from './monitor.js';
export type { WeixinMessageEvent } from './monitor.js';
export { startWeixinLoginWithQr, waitForWeixinLogin, displayQRCode, generateQRCodeText } from './login.js';
export { resolveWeixinAccount, listIndexedWeixinAccountIds, loadWeixinAccount, saveWeixinAccount, clearWeixinAccount, registerWeixinAccountId, DEFAULT_BASE_URL } from './auth.js';
export { clearContextTokensForAccount } from './context-token.js';
export { sendMessageWeixin } from './send.js';
export { WeixinChannel } from './channel.js';
export type { RunAgentFn, EnableAutoApproveFn } from './plugin-types.js';
