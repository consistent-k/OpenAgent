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
    pluginsLoaded = true;

    const channelPkgs = getConfiguredChannels();
    if (channelPkgs.length === 0) return;

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
                loadError = `包 "${pkgName}" 没有导出 register 函数`;
                continue;
            }
            // 调用插件的 register，注入 runAgent
            mod.register(channelManager, { runAgent });
        } catch (err) {
            loadError = `加载 channel 插件 "${pkgName}" 失败: ${err instanceof Error ? err.message : String(err)}`;
        }
    }
}

// ---------------------------------------------------------------------------
// 命令实现
// ---------------------------------------------------------------------------

export const channelCommand: SlashCommand = {
    name: '/channel',
    description: '管理消息渠道（start/stop/login/status）',
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
                    lines.push('❌ 请指定 channel，如: /channel start weixin');
                    break;
                }
                const channel = channelManager.get(target);
                if (!channel) {
                    lines.push(`❌ 未知 channel: ${target}`);
                    const available = channelManager.list().map((c) => c.id);
                    if (available.length > 0) {
                        lines.push(`可用: ${available.join(', ')}`);
                    } else {
                        lines.push('无已注册的 channel，请在 config.json 中配置 channels');
                    }
                    break;
                }
                if (channelManager.isRunning(target)) {
                    lines.push(`⚠️ ${channel.name} 已在运行中`);
                    break;
                }
                if (!channel.isConfigured()) {
                    lines.push(`❌ ${channel.name} 未配置`);
                    lines.push(...channel.getStatusInfo());
                    break;
                }

                // 为 channel 创建独立的审批存储，存储在 approvals/ 目录下
                const channelStore = new ApprovalStore(path.join(APPROVALS_DIR, `${channel.id}.json`));
                channelStore.setToolApprovals(Array.from(APPROVABLE_TOOLS, (tool) => ({ toolName: tool, approved: true })));

                // 显示启动消息
                lines.push(`🤖 ${channel.name} 启动中...`);
                lines.push(...channel.getStatusInfo());
                lines.push(`使用 /channel stop ${target} 停止`);

                appendMessages([
                    { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
                    { id: uid(), role: 'assistant', parts: [{ type: 'text', text: lines.join('\n'), state: 'done' }] }
                ]);

                // 在 channelStore 上下文中异步启动，工具的 needsApproval 会自动使用此 store
                withStore(channelStore, () =>
                    channelManager
                        .start(target, (event) => {
                            const prefix = event.type === 'inbound' ? `📩 [${event.channelId}]` : event.type === 'reply' ? `📤 [${event.channelId}]` : `❌ [${event.channelId}]`;
                            appendMessages([
                                {
                                    id: uid(),
                                    role: 'assistant',
                                    parts: [{ type: 'text', text: `${prefix} ${event.userId}\n${event.text}`, state: 'done' }]
                                }
                            ]);
                        })
                        .then(() => {
                            appendMessages([
                                {
                                    id: uid(),
                                    role: 'assistant',
                                    parts: [{ type: 'text', text: `⏹️ ${channel.name} 已停止`, state: 'done' }]
                                }
                            ]);
                        })
                        .catch((err) => {
                            appendMessages([
                                {
                                    id: uid(),
                                    role: 'assistant',
                                    parts: [{ type: 'text', text: `❌ ${channel.name} 异常退出: ${err}`, state: 'done' }]
                                }
                            ]);
                        })
                );
                return;
            }

            case 'stop': {
                if (target === 'all') {
                    await channelManager.stopAll();
                    lines.push('⏹️ 所有 channel 已停止');
                    break;
                }
                if (!target) {
                    lines.push('❌ 请指定 channel，如: /channel stop weixin');
                    break;
                }
                if (!channelManager.isRunning(target)) {
                    lines.push(`⚠️ ${target} 未在运行`);
                    break;
                }
                await channelManager.stop(target);
                lines.push(`⏹️ ${target} 已停止`);
                break;
            }

            case 'login': {
                if (!target) {
                    lines.push('❌ 请指定 channel，如: /channel login weixin');
                    break;
                }
                const channel = channelManager.get(target);
                if (!channel) {
                    lines.push(`❌ 未知 channel: ${target}`);
                    break;
                }
                if (channelManager.isRunning(target)) {
                    lines.push(`⚠️ ${channel.name} 正在运行中，请先 /channel stop ${target}`);
                    break;
                }
                if (!channel.login) {
                    lines.push(`❌ ${channel.name} 不支持 login 命令`);
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
                            appendMessages([{ id: uid(), role: 'assistant', parts: [{ type: 'text', text: `❌ ${channel.name} 配置失败: ${err}`, state: 'done' }] }]);
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
                        appendMessages([{ id: uid(), role: 'assistant', parts: [{ type: 'text', text: `❌ ${channel.name} 登录失败: ${err}`, state: 'done' }] }]);
                    });
                return;
            }

            case 'logout': {
                if (!target) {
                    lines.push('❌ 请指定 channel，如: /channel logout weixin');
                    break;
                }
                const channel = channelManager.get(target);
                if (!channel) {
                    lines.push(`❌ 未知 channel: ${target}`);
                    break;
                }
                if (channelManager.isRunning(target)) {
                    lines.push(`⚠️ ${channel.name} 正在运行中，请先 /channel stop ${target}`);
                    break;
                }
                if (!channel.logout) {
                    lines.push(`❌ ${channel.name} 不支持 logout 命令`);
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
                        lines.push('📭 未配置任何 channel 插件');
                        lines.push('在 config.json 中添加:');
                        lines.push('  { "channels": ["@oagent/weixin"] }');
                    } else {
                        lines.push(`📭 已配置但未加载: ${configured.join(', ')}`);
                        lines.push('请确保已安装对应的 npm 包');
                    }
                    break;
                }

                lines.push('📡 Channel 状态\n');
                for (const ch of channels) {
                    const running = channelManager.isRunning(ch.id);
                    const icon = running ? '🟢' : ch.isConfigured() ? '⚪' : '🔴';
                    const statusText = running ? '运行中' : ch.isConfigured() ? '已就绪' : '未配置';
                    lines.push(`${icon} ${ch.name} (${ch.id}) — ${statusText}`);
                    for (const info of ch.getStatusInfo()) {
                        lines.push(`   ${info}`);
                    }
                    if (running) {
                        const uptime = channelManager.getUptime(ch.id);
                        const min = Math.floor(uptime / 60_000);
                        const sec = Math.floor((uptime % 60_000) / 1000);
                        lines.push(`   运行时长: ${min}m ${sec}s`);
                    }
                    lines.push('');
                }

                lines.push('命令:');
                lines.push('  /channel start <id>    启动');
                lines.push('  /channel stop <id>     停止');
                lines.push('  /channel stop all      停止所有');
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
