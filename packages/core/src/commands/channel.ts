/**
 * /channel 命令 — 统一管理所有渠道
 *
 * 用法:
 *   /channel                  # 列出所有 channel 状态
 *   /channel start <id>       # 启动指定 channel
 *   /channel stop <id>        # 停止指定 channel
 *   /channel stop all         # 停止所有 channel
 *   /channel login <id>       # 绑定指定 channel（如扫码）
 *   /channel logout <id>      # 解绑指定 channel
 *
 * Channel 插件通过 config.json 的 channels 字段配置:
 *   { "channels": ["@oagent/weixin"] }
 */
import path from 'node:path';
import { channelManager } from '@oagent/channels';
import { t } from '@oagent/i18n';
import { getConfiguredChannels } from '../config';
import { runAgent } from '../engine';
import { ApprovalStore, APPROVABLE_TOOLS, withStore, APPROVALS_DIR } from '../engine/tools/utils/approval-store';
import { uid } from '../utils/uid';
import type { SlashCommand } from './registry';

// ---------------------------------------------------------------------------
// 插件加载
// ---------------------------------------------------------------------------

let pluginsLoaded = false;
let loadError: string | null = null;

/**
 * 从 config.json 读取 channels 列表，动态加载并注册插件
 */
async function ensurePlugins(): Promise<void> {
    if (pluginsLoaded) return;

    const channelPkgs = getConfiguredChannels();
    if (channelPkgs.length === 0) {
        pluginsLoaded = true;
        return;
    }

    for (const pkgName of channelPkgs) {
        try {
            let mod;
            try {
                mod = await import(pkgName);
            } catch {
                // 全局找不到时，尝试从用户 cwd 的 node_modules 加载
                const localPath = path.resolve(process.cwd(), 'node_modules', pkgName, 'dist', 'index.js');
                mod = await import(localPath);
            }
            if (typeof mod.register !== 'function') {
                loadError = t('command.channel.pluginNoRegister', { pkgName });
                continue;
            }
            // 调用插件的 register，注入 runAgent
            mod.register(channelManager, { runAgent });
        } catch (err) {
            loadError = t('command.channel.pluginLoadFailed', { pkgName, err: err instanceof Error ? err.message : String(err) });
        }
    }
    // 所有插件加载完成（包括失败的），标记为已加载
    pluginsLoaded = true;
}

// ---------------------------------------------------------------------------
// 命令实现
// ---------------------------------------------------------------------------

export const channelCommand: SlashCommand = {
    name: '/channel',
    getDescription: () => t('command.channel.description'),
    run: async ({ rawInput, args, appendMessages }) => {
        await ensurePlugins();

        const sub = args[0] ?? 'status';
        const target = args[1] ?? '';
        const lines: string[] = [];

        // 显示加载错误
        if (loadError) {
            lines.push(`⚠️ ${loadError}`);
            loadError = null;
        }

        switch (sub) {
            case 'start': {
                if (!target) {
                    lines.push(t('command.channel.specifyChannel', { verb: 'start' }));
                    break;
                }
                const channel = channelManager.get(target);
                if (!channel) {
                    lines.push(t('command.channel.unknownChannel', { target }));
                    const available = channelManager.list().map((c) => c.id);
                    if (available.length > 0) {
                        lines.push(t('command.channel.available', { available: available.join(', ') }));
                    } else {
                        lines.push(t('command.channel.noRegistered'));
                    }
                    break;
                }
                if (channelManager.isRunning(target)) {
                    lines.push(t('command.channel.alreadyRunning', { name: channel.name }));
                    break;
                }
                if (!channel.isConfigured()) {
                    lines.push(t('command.channel.notConfigured', { name: channel.name }));
                    lines.push(...channel.getStatusInfo());
                    break;
                }

                // 为 channel 创建独立的审批存储，存储在 approvals/ 目录下
                const channelStore = new ApprovalStore(path.join(APPROVALS_DIR, `${channel.id}.json`));
                channelStore.setToolApprovals(Array.from(APPROVABLE_TOOLS, (tool) => ({ toolName: tool, approved: true })));

                // 显示启动消息
                lines.push(t('command.channel.starting', { name: channel.name }));
                lines.push(...channel.getStatusInfo());
                lines.push(t('command.channel.stopHint', { target }));

                appendMessages([
                    { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
                    { id: uid(), role: 'assistant', parts: [{ type: 'text', text: lines.join('\n'), state: 'done' }] }
                ]);

                // 异步启动 channel，事件回调中使用 withStore 确保审批上下文正确
                channelManager
                    .start(target, (event) => {
                        // 在事件回调中使用 withStore，确保工具审批使用 channelStore
                        withStore(channelStore, () => {
                            const prefix = event.type === 'inbound' ? `📩 [${event.channelId}]` : event.type === 'reply' ? `📤 [${event.channelId}]` : `❌ [${event.channelId}]`;
                            appendMessages([
                                {
                                    id: uid(),
                                    role: 'assistant',
                                    parts: [{ type: 'text', text: `${prefix} ${event.userId}\n${event.text}`, state: 'done' }]
                                }
                            ]);
                        });
                    })
                    .then(() => {
                        appendMessages([
                            {
                                id: uid(),
                                role: 'assistant',
                                parts: [{ type: 'text', text: t('command.channel.stopped', { name: channel.name }), state: 'done' }]
                            }
                        ]);
                    })
                    .catch((err) => {
                        appendMessages([
                            {
                                id: uid(),
                                role: 'assistant',
                                parts: [{ type: 'text', text: t('command.channel.exitedWithError', { name: channel.name, err: String(err) }), state: 'done' }]
                            }
                        ]);
                    });
                return;
            }

            case 'stop': {
                if (target === 'all') {
                    await channelManager.stopAll();
                    lines.push(t('command.channel.allStopped'));
                    break;
                }
                if (!target) {
                    lines.push(t('command.channel.specifyChannel', { verb: 'stop' }));
                    break;
                }
                if (!channelManager.isRunning(target)) {
                    lines.push(t('command.channel.notRunning', { target }));
                    break;
                }
                await channelManager.stop(target);
                lines.push(t('command.channel.channelStopped', { target }));
                break;
            }

            case 'login': {
                if (!target) {
                    lines.push(t('command.channel.specifyChannel', { verb: 'login' }));
                    break;
                }
                const channel = channelManager.get(target);
                if (!channel) {
                    lines.push(t('command.channel.unknownChannel', { target }));
                    break;
                }
                if (channelManager.isRunning(target)) {
                    lines.push(t('command.channel.runningStopFirst', { name: channel.name, target }));
                    break;
                }
                if (!channel.login) {
                    lines.push(t('command.channel.loginNotSupported', { name: channel.name }));
                    break;
                }

                // 支持 /channel login <id> <token> 格式（如 Telegram）
                const token = args[2] ?? '';
                if (token && 'configureToken' in channel && typeof (channel as Record<string, unknown>).configureToken === 'function') {
                    appendMessages([{ id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] }]);
                    (channel as { configureToken: (t: string) => Promise<string[]> })
                        .configureToken(token)
                        .then((resultLines: string[]) => {
                            appendMessages([{ id: uid(), role: 'assistant', parts: [{ type: 'text', text: resultLines.join('\n'), state: 'done' }] }]);
                        })
                        .catch((err: unknown) => {
                            appendMessages([
                                { id: uid(), role: 'assistant', parts: [{ type: 'text', text: t('command.channel.configFailed', { name: channel.name, err: String(err) }), state: 'done' }] }
                            ]);
                        });
                    return;
                }

                appendMessages([{ id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] }]);

                // 异步执行，不阻塞 TUI
                channel
                    .login((statusLines) => {
                        // 立即展示二维码
                        appendMessages([{ id: uid(), role: 'assistant', parts: [{ type: 'text', text: statusLines.join('\n'), state: 'done' }] }]);
                    })
                    .then((resultLines) => {
                        appendMessages([{ id: uid(), role: 'assistant', parts: [{ type: 'text', text: resultLines.join('\n'), state: 'done' }] }]);
                    })
                    .catch((err) => {
                        appendMessages([{ id: uid(), role: 'assistant', parts: [{ type: 'text', text: t('command.channel.loginFailed', { name: channel.name, err: String(err) }), state: 'done' }] }]);
                    });
                return;
            }

            case 'logout': {
                if (!target) {
                    lines.push(t('command.channel.specifyChannel', { verb: 'logout' }));
                    break;
                }
                const channel = channelManager.get(target);
                if (!channel) {
                    lines.push(t('command.channel.unknownChannel', { target }));
                    break;
                }
                if (channelManager.isRunning(target)) {
                    lines.push(t('command.channel.runningStopFirst', { name: channel.name, target }));
                    break;
                }
                if (!channel.logout) {
                    lines.push(t('command.channel.logoutNotSupported', { name: channel.name }));
                    break;
                }

                const logoutLines = await channel.logout();
                lines.push(...logoutLines);
                break;
            }

            case 'status':
            default: {
                const channels = channelManager.list();
                if (channels.length === 0) {
                    const configured = getConfiguredChannels();
                    if (configured.length === 0) {
                        lines.push(t('command.channel.noPluginsConfigured'));
                        lines.push(t('command.channel.addInConfig'));
                        lines.push('  { "channels": ["@oagent/weixin"] }');
                    } else {
                        lines.push(t('command.channel.configuredNotLoaded', { configured: configured.join(', ') }));
                        lines.push(t('command.channel.ensureInstalled'));
                    }
                    break;
                }

                lines.push(t('command.channel.statusHeader'));
                for (const ch of channels) {
                    const running = channelManager.isRunning(ch.id);
                    const icon = running ? '🟢' : ch.isConfigured() ? '⚪' : '🔴';
                    const statusText = running ? t('command.channel.statusRunning') : ch.isConfigured() ? t('command.channel.statusReady') : t('command.channel.statusUnconfigured');
                    lines.push(`${icon} ${ch.name} (${ch.id}) — ${statusText}`);
                    for (const info of ch.getStatusInfo()) {
                        lines.push(`   ${info}`);
                    }
                    if (running) {
                        const uptime = channelManager.getUptime(ch.id);
                        const min = Math.floor(uptime / 60_000);
                        const sec = Math.floor((uptime % 60_000) / 1000);
                        lines.push(t('command.channel.uptime', { min, sec }));
                    }
                    lines.push('');
                }

                lines.push(t('command.channel.commands'));
                lines.push(t('command.channel.helpStart'));
                lines.push(t('command.channel.helpStop'));
                lines.push(t('command.channel.helpStopAll'));
            }
        }

        if (lines.length > 0) {
            appendMessages([
                { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
                { id: uid(), role: 'assistant', parts: [{ type: 'text', text: lines.join('\n'), state: 'done' }] }
            ]);
        }
    }
};
