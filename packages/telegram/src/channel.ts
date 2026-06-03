/**
 * Telegram Channel 适配器
 * 实现 @oagent/channels 的 Channel 接口
 */
import type { Channel, ChannelStartOpts, ChannelStatus } from '@oagent/channels';
import { createTelegramClient } from './api/client';
import { monitorTelegramProvider } from './monitor/main';
import { loadAccount, saveAccount, clearAccount, hasAccount } from './storage/accounts';
import type { RunAgentFn } from './types/plugin';
import { redactToken } from './utils/redact';

export interface TelegramChannelOpts {
    runAgent: RunAgentFn;
}

interface TelegramResponse<T> {
    ok: boolean;
    result: T;
    description?: string;
}

interface TelegramUser {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
}

export class TelegramChannel implements Channel {
    readonly id = 'telegram';
    readonly name = 'Telegram';
    status: ChannelStatus = 'idle';

    private runAgent: RunAgentFn;

    constructor(opts: TelegramChannelOpts) {
        this.runAgent = opts.runAgent;
    }

    isConfigured(): boolean {
        return hasAccount();
    }

    getStatusInfo(): string[] {
        const lines: string[] = [];
        const account = loadAccount();
        if (account) {
            lines.push(`Bot: @${account.botUsername ?? '未知'} (ID: ${account.botId ?? '未知'})`);
            lines.push(`Token: ${redactToken(account.token)}`);
            lines.push('✅ 已配置');
        } else {
            lines.push('❌ 未配置');
            lines.push('请先运行 /channel login telegram');
        }
        return lines;
    }

    async start(opts: ChannelStartOpts): Promise<void> {
        const account = loadAccount();
        if (!account) {
            throw new Error('未配置 Telegram Bot Token，请先运行 /channel login telegram');
        }

        this.status = 'running';

        const client = createTelegramClient(account.token);

        try {
            await monitorTelegramProvider({
                client,
                abortSignal: opts.abortSignal,
                onMessage: (event) => {
                    opts.onMessage({
                        type: event.type,
                        channelId: this.id,
                        userId: event.userId,
                        text: event.text
                    });
                },
                runAgent: this.runAgent
            });
        } finally {
            this.status = 'idle';
        }
    }

    async stop(): Promise<void> {
        this.status = 'idle';
    }

    async login(_onStatus?: (lines: string[]) => void): Promise<string[]> {
        // 检查是否已有配置
        const existing = loadAccount();
        if (existing) {
            return [`❌ 已配置 Bot: @${existing.botUsername ?? '未知'}`, '请先运行 /channel logout telegram 解绑后再重新配置'];
        }

        return [
            '请按以下步骤获取 Telegram Bot Token:',
            '1. 在 Telegram 中搜索 @BotFather',
            '2. 发送 /newbot 创建新机器人（或使用已有的 bot）',
            '3. 复制 BotFather 给你的 Token',
            '4. 执行: /channel login telegram <你的Token>'
        ];
    }

    /** 验证并保存 token（由外部调用） */
    async configureToken(token: string): Promise<string[]> {
        const lines: string[] = [];

        try {
            const client = createTelegramClient(token);
            const resp = await client.get<TelegramResponse<TelegramUser>>('/getMe');

            if (!resp.data.ok) {
                lines.push(`❌ Token 验证失败: ${resp.data.description}`);
                return lines;
            }

            const bot = resp.data.result;
            if (!bot.is_bot) {
                lines.push('❌ 该 Token 不属于 Bot');
                return lines;
            }

            saveAccount({
                token,
                botId: String(bot.id),
                botUsername: bot.username
            });

            lines.push(`✅ 配置成功！Bot: @${bot.username ?? bot.id}`);
            lines.push('现在可以运行 /channel start telegram 启动监听');
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            lines.push(`❌ Token 验证失败: ${errMsg}`);
        }

        return lines;
    }

    async logout(): Promise<string[]> {
        const lines: string[] = [];

        if (!hasAccount()) {
            lines.push('❌ 未配置 Telegram Bot');
            return lines;
        }

        const account = loadAccount();
        clearAccount();
        lines.push(`✅ 已清除 Bot 配置: @${account?.botUsername ?? '未知'}`);

        return lines;
    }
}
