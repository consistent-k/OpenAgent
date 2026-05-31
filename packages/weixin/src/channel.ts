/**
 * 微信 Channel 适配器
 * 实现 @oagent/channels 的 Channel 接口
 */
import type { Channel, ChannelStartOpts, ChannelStatus } from '@oagent/channels';
import type { RunAgentFn, EnableAutoApproveFn } from './plugin-types.js';
import {
    monitorWeixinProvider,
    listIndexedWeixinAccountIds,
    resolveWeixinAccount,
    startWeixinLoginWithQr,
    waitForWeixinLogin,
    generateQRCodeText,
    saveWeixinAccount,
    registerWeixinAccountId,
    clearContextTokensForAccount,
    clearWeixinAccount
} from './index.js';

export interface WeixinChannelOpts {
    runAgent: RunAgentFn;
    enableAutoApprove?: EnableAutoApproveFn;
}

export class WeixinChannel implements Channel {
    readonly id = 'weixin';
    readonly name = '微信';
    status: ChannelStatus = 'idle';

    private runAgent: RunAgentFn;
    private enableAutoApprove?: EnableAutoApproveFn;

    constructor(opts: WeixinChannelOpts) {
        this.runAgent = opts.runAgent;
        this.enableAutoApprove = opts.enableAutoApprove;
    }

    isConfigured(): boolean {
        const accountIds = listIndexedWeixinAccountIds();
        if (accountIds.length === 0) return false;
        const account = resolveWeixinAccount(accountIds[0]);
        return account.configured;
    }

    getStatusInfo(): string[] {
        const lines: string[] = [];
        const accountIds = listIndexedWeixinAccountIds();
        lines.push(`账号数: ${accountIds.length}`);
        for (const id of accountIds) {
            const account = resolveWeixinAccount(id);
            lines.push(`  ${id}: ${account.configured ? '✅ 已配置' : '❌ 未配置'}`);
        }
        return lines;
    }

    async start(opts: ChannelStartOpts): Promise<void> {
        const accountIds = listIndexedWeixinAccountIds();
        if (accountIds.length === 0) {
            throw new Error('未找到微信账号，请先运行 /channel login weixin');
        }

        const account = resolveWeixinAccount(accountIds[0]);
        if (!account.configured) {
            throw new Error(`微信账号 ${account.accountId} 未配置（缺少 token）`);
        }

        this.status = 'running';

        try {
            await monitorWeixinProvider({
                baseUrl: account.baseUrl,
                token: account.token!,
                accountId: account.accountId,
                abortSignal: opts.abortSignal,
                onMessage: (event) => {
                    opts.onMessage({
                        type: event.type,
                        channelId: this.id,
                        userId: event.userId,
                        text: event.text
                    });
                },
                runAgent: this.runAgent,
                enableAutoApprove: this.enableAutoApprove
            });
        } finally {
            this.status = 'idle';
        }
    }

    async stop(): Promise<void> {
        this.status = 'idle';
    }

    async login(onStatus?: (lines: string[]) => void): Promise<string[]> {
        // 检查是否已有绑定
        const existingIds = listIndexedWeixinAccountIds();
        if (existingIds.length > 0) {
            const existing = resolveWeixinAccount(existingIds[0]);
            if (existing.configured) {
                return [`❌ 已绑定机器人: ${existing.accountId}`, '请先运行 /channel logout weixin 解绑后再重新绑定'];
            }
        }

        const qrResult = await startWeixinLoginWithQr({});

        // 立即返回二维码信息
        const qrLines: string[] = [];
        if (qrResult.qrcodeUrl) {
            const qrText = await generateQRCodeText(qrResult.qrcodeUrl);
            if (qrText) {
                qrLines.push(qrText);
            }
            qrLines.push(`若二维码未能显示，请访问: ${qrResult.qrcodeUrl}`);
        }
        qrLines.push(qrResult.message);
        qrLines.push('等待扫码...');
        onStatus?.(qrLines);

        // 等待扫码结果
        const waitResult = await waitForWeixinLogin({ sessionKey: qrResult.sessionKey });

        const resultLines: string[] = [];
        if (waitResult.connected && waitResult.accountId) {
            // 清除旧账号
            for (const oldId of listIndexedWeixinAccountIds()) {
                clearWeixinAccount(oldId);
                clearContextTokensForAccount(oldId);
            }

            saveWeixinAccount(waitResult.accountId, {
                token: waitResult.botToken,
                baseUrl: waitResult.baseUrl
            });
            registerWeixinAccountId(waitResult.accountId);
            clearContextTokensForAccount(waitResult.accountId);

            resultLines.push(`✅ 绑定成功！账号: ${waitResult.accountId}`);
        } else {
            resultLines.push(`❌ ${waitResult.message}`);
        }

        return resultLines;
    }

    async logout(): Promise<string[]> {
        const lines: string[] = [];
        const accountIds = listIndexedWeixinAccountIds();

        if (accountIds.length === 0) {
            lines.push('❌ 没有已绑定的微信账号');
            return lines;
        }

        for (const id of accountIds) {
            clearWeixinAccount(id);
            clearContextTokensForAccount(id);
            lines.push(`✅ 已解绑: ${id}`);
        }

        return lines;
    }
}
