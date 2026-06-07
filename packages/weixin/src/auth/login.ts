/**
 * 微信扫码登录
 * 提取自 @tencent-weixin/openclaw-weixin/src/auth/login-qr.ts
 */
import { randomUUID } from 'node:crypto';
import { apiGetFetch, apiPostFetch } from '../api/client';
import { logger } from '../utils/logger';
import { redactToken } from '../utils/redact';
import { listIndexedWeixinAccountIds, loadWeixinAccount } from './accounts';

type ActiveLogin = {
    sessionKey: string;
    id: string;
    qrcode: string;
    qrcodeUrl: string;
    startedAt: number;
    botToken?: string;
    status?: 'wait' | 'scaned' | 'confirmed' | 'expired' | 'scaned_but_redirect' | 'need_verifycode' | 'verify_code_blocked' | 'binded_redirect';
    error?: string;
    currentApiBaseUrl?: string;
    pendingVerifyCode?: string;
};

const ACTIVE_LOGIN_TTL_MS = 5 * 60_000;
const QR_LONG_POLL_TIMEOUT_MS = 35_000;

/** ilink get_bot_qrcode / get_qrcode_status 的默认 bot_type */
export const DEFAULT_ILINK_BOT_TYPE = '3';

/** QR 码请求的固定 API 基础 URL */
const FIXED_BASE_URL = 'https://ilinkai.weixin.qq.com';

const activeLogins = new Map<string, ActiveLogin>();

interface QRCodeResponse {
    qrcode: string;
    qrcode_img_content: string;
}

interface StatusResponse {
    status: 'wait' | 'scaned' | 'confirmed' | 'expired' | 'scaned_but_redirect' | 'need_verifycode' | 'verify_code_blocked' | 'binded_redirect';
    bot_token?: string;
    ilink_bot_id?: string;
    baseurl?: string;
    ilink_user_id?: string;
    redirect_host?: string;
}

function isLoginFresh(login: ActiveLogin): boolean {
    return Date.now() - login.startedAt < ACTIVE_LOGIN_TTL_MS;
}

/** 清除过期的登录会话 */
function purgeExpiredLogins(): void {
    for (const [id, login] of activeLogins) {
        if (!isLoginFresh(login)) {
            activeLogins.delete(id);
        }
    }
}

/** 获取本地已登录账号的 bot token 列表 */
function getLocalBotTokenList(): string[] {
    const accountIds = listIndexedWeixinAccountIds();
    const tokens: string[] = [];
    for (let i = accountIds.length - 1; i >= 0 && tokens.length < 10; i--) {
        const data = loadWeixinAccount(accountIds[i]);
        const token = data?.token?.trim();
        if (token) {
            tokens.push(token);
        }
    }
    return tokens;
}

async function fetchQRCode(apiBaseUrl: string, botType: string): Promise<QRCodeResponse> {
    logger.info(`Fetching QR code from: ${apiBaseUrl} bot_type=${botType}`);
    const localTokenList = getLocalBotTokenList();
    logger.info(`fetchQRCode: local_token_list count=${localTokenList.length}`);
    const rawText = await apiPostFetch({
        baseUrl: apiBaseUrl,
        endpoint: `ilink/bot/get_bot_qrcode?bot_type=${encodeURIComponent(botType)}`,
        body: JSON.stringify({ local_token_list: localTokenList }),
        label: 'fetchQRCode'
    });
    return JSON.parse(rawText) as QRCodeResponse;
}

/** 从 stdin 读取验证码（5 分钟超时） */
async function readVerifyCodeFromStdin(prompt: string): Promise<string> {
    process.stdout.write(prompt);
    return new Promise((resolve, reject) => {
        let input = '';
        const timeout = setTimeout(
            () => {
                process.stdin.removeListener('data', onData);
                process.stdin.pause();
                reject(new Error('读取验证码超时'));
            },
            5 * 60 * 1000
        );
        const onData = (chunk: Buffer | string) => {
            const str = chunk.toString();
            input += str;
            if (input.includes('\n')) {
                clearTimeout(timeout);
                process.stdin.removeListener('data', onData);
                process.stdin.pause();
                resolve(input.trim());
            }
        };
        process.stdin.resume();
        process.stdin.setEncoding('utf-8');
        process.stdin.on('data', onData);
    });
}

async function pollQRStatus(apiBaseUrl: string, qrcode: string, verifyCode?: string): Promise<StatusResponse> {
    logger.debug(`Polling QR status from: ${apiBaseUrl}`);
    try {
        let endpoint = `ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(qrcode)}`;
        if (verifyCode) {
            endpoint += `&verify_code=${encodeURIComponent(verifyCode)}`;
        }
        const rawText = await apiGetFetch({
            baseUrl: apiBaseUrl,
            endpoint,
            timeoutMs: QR_LONG_POLL_TIMEOUT_MS,
            label: 'pollQRStatus'
        });
        return JSON.parse(rawText) as StatusResponse;
    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
            logger.debug(`pollQRStatus: client-side timeout after ${QR_LONG_POLL_TIMEOUT_MS}ms`);
            return { status: 'wait' };
        }
        logger.warn(`pollQRStatus: network error, will retry: ${String(err)}`);
        return { status: 'wait' };
    }
}

/**
 * 在终端展示二维码及备用链接
 */
export async function displayQRCode(qrcodeUrl: string): Promise<void> {
    try {
        const qrterm = await import('qrcode-terminal');
        qrterm.default.generate(qrcodeUrl, { small: true });
        process.stdout.write('若二维码未能显示或无法使用，你可以访问以下链接以继续：\n');
        process.stdout.write(`${qrcodeUrl}\n`);
    } catch {
        process.stdout.write('若二维码未能显示或无法使用，你可以访问以下链接以继续：\n');
        process.stdout.write(`${qrcodeUrl}\n`);
    }
}

/**
 * 生成二维码文本（用于 TUI 等非 stdout 场景）
 */
export async function generateQRCodeText(qrcodeUrl: string): Promise<string> {
    try {
        const qrterm = await import('qrcode-terminal');
        return new Promise((resolve) => {
            qrterm.default.generate(qrcodeUrl, { small: true }, (qr: string) => {
                resolve(qr);
            });
        });
    } catch {
        return '';
    }
}

export type WeixinQrStartResult = {
    qrcodeUrl?: string;
    message: string;
    sessionKey: string;
};

export type WeixinQrWaitResult = {
    connected: boolean;
    alreadyConnected?: boolean;
    botToken?: string;
    accountId?: string;
    baseUrl?: string;
    userId?: string;
    message: string;
};

/** 发起扫码登录 */
export async function startWeixinLoginWithQr(opts: { verbose?: boolean; force?: boolean; accountId?: string; apiBaseUrl?: string; botType?: string }): Promise<WeixinQrStartResult> {
    const sessionKey = opts.accountId || randomUUID();

    purgeExpiredLogins();

    const existing = activeLogins.get(sessionKey);
    if (!opts.force && existing && isLoginFresh(existing) && existing.qrcodeUrl) {
        return {
            qrcodeUrl: existing.qrcodeUrl,
            message: '二维码已显示，请用手机微信扫描。',
            sessionKey
        };
    }

    try {
        const botType = opts.botType || DEFAULT_ILINK_BOT_TYPE;
        logger.info(`Starting Weixin login with bot_type=${botType}`);

        const qrResponse = await fetchQRCode(opts.apiBaseUrl || FIXED_BASE_URL, botType);
        logger.info(`QR code received, qrcode=${redactToken(qrResponse.qrcode)}`);
        logger.info(`二维码链接: ${qrResponse.qrcode_img_content}`);

        const login: ActiveLogin = {
            sessionKey,
            id: randomUUID(),
            qrcode: qrResponse.qrcode,
            qrcodeUrl: qrResponse.qrcode_img_content,
            startedAt: Date.now()
        };

        activeLogins.set(sessionKey, login);

        return {
            qrcodeUrl: qrResponse.qrcode_img_content,
            message: '用手机微信扫描以下二维码，以继续连接：',
            sessionKey
        };
    } catch (err) {
        logger.error(`Failed to start Weixin login: ${String(err)}`);
        return {
            message: `Failed to start login: ${String(err)}`,
            sessionKey
        };
    }
}

const MAX_QR_REFRESH_COUNT = 3;

/** 刷新二维码 */
async function refreshQRCode(activeLogin: ActiveLogin, botType: string, qrRefreshCount: number, onScannedReset: () => void): Promise<{ success: true } | { success: false; message: string }> {
    process.stdout.write(`\n⏳ 正在刷新二维码...(${qrRefreshCount}/${MAX_QR_REFRESH_COUNT})\n`);
    logger.info(`Refreshing QR code (${qrRefreshCount}/${MAX_QR_REFRESH_COUNT})`);
    try {
        const qrResponse = await fetchQRCode(FIXED_BASE_URL, botType);
        activeLogin.qrcode = qrResponse.qrcode;
        activeLogin.qrcodeUrl = qrResponse.qrcode_img_content;
        activeLogin.startedAt = Date.now();
        onScannedReset();
        logger.info(`New QR code obtained qrcode=${redactToken(qrResponse.qrcode)}`);
        process.stdout.write('🔄 二维码已更新，请重新扫描。\n\n');
        await displayQRCode(qrResponse.qrcode_img_content);
        return { success: true };
    } catch (refreshErr) {
        logger.error(`Failed to refresh QR code: ${String(refreshErr)}`);
        return {
            success: false,
            message: `刷新二维码失败: ${String(refreshErr)}`
        };
    }
}

/** 等待扫码登录完成 */
export async function waitForWeixinLogin(opts: { timeoutMs?: number; verbose?: boolean; sessionKey: string; apiBaseUrl?: string; botType?: string }): Promise<WeixinQrWaitResult> {
    const activeLogin = activeLogins.get(opts.sessionKey);

    if (!activeLogin) {
        logger.warn(`waitForWeixinLogin: no active login sessionKey=${opts.sessionKey}`);
        return {
            connected: false,
            message: '当前没有进行中的登录，请先发起登录。'
        };
    }

    if (!isLoginFresh(activeLogin)) {
        logger.warn(`waitForWeixinLogin: login QR expired sessionKey=${opts.sessionKey}`);
        activeLogins.delete(opts.sessionKey);
        return {
            connected: false,
            message: '二维码已过期，请重新生成。'
        };
    }

    const timeoutMs = Math.max(opts.timeoutMs ?? 480_000, 1000);
    const deadline = Date.now() + timeoutMs;
    let scannedPrinted = false;
    let qrRefreshCount = 1;

    activeLogin.currentApiBaseUrl = opts.apiBaseUrl || FIXED_BASE_URL;

    logger.info('Starting to poll QR code status...');

    while (Date.now() < deadline) {
        try {
            const currentBaseUrl = activeLogin.currentApiBaseUrl ?? FIXED_BASE_URL;
            const statusResponse = await pollQRStatus(currentBaseUrl, activeLogin.qrcode, activeLogin.pendingVerifyCode);
            logger.debug(`pollQRStatus: status=${statusResponse.status} hasBotToken=${Boolean(statusResponse.bot_token)}`);
            activeLogin.status = statusResponse.status;

            switch (statusResponse.status) {
                case 'wait':
                    if (opts.verbose) {
                        process.stdout.write('.');
                    }
                    break;
                case 'scaned':
                    if (activeLogin.pendingVerifyCode) {
                        logger.info('verify code accepted, resuming polling');
                        activeLogin.pendingVerifyCode = undefined;
                    }
                    if (!scannedPrinted) {
                        process.stdout.write('\n正在验证\n');
                        scannedPrinted = true;
                    }
                    break;
                case 'need_verifycode': {
                    const verifyPrompt = activeLogin.pendingVerifyCode ? '❌ 你输入的数字不匹配，请重新输入：' : '输入手机微信显示的数字，以继续连接：';
                    const code = await readVerifyCodeFromStdin(verifyPrompt);
                    activeLogin.pendingVerifyCode = code;
                    continue;
                }
                case 'expired': {
                    qrRefreshCount++;
                    if (qrRefreshCount > MAX_QR_REFRESH_COUNT) {
                        logger.warn(`QR expired ${MAX_QR_REFRESH_COUNT} times, giving up`);
                        activeLogins.delete(opts.sessionKey);
                        return {
                            connected: false,
                            message: '二维码多次失效，连接流程已停止。请稍后再试。'
                        };
                    }
                    process.stdout.write('\n⏳ 二维码已过期，正在刷新...\n');
                    const result = await refreshQRCode(activeLogin, opts.botType || DEFAULT_ILINK_BOT_TYPE, qrRefreshCount, () => {
                        scannedPrinted = false;
                    });
                    if (!result.success) {
                        activeLogins.delete(opts.sessionKey);
                        return { connected: false, message: result.message };
                    }
                    break;
                }
                case 'verify_code_blocked': {
                    logger.warn(`verify code blocked, qrRefreshCount=${qrRefreshCount}`);
                    process.stdout.write('\n⛔ 多次输入错误，请稍后再试。\n');
                    activeLogin.pendingVerifyCode = undefined;

                    qrRefreshCount++;
                    if (qrRefreshCount > MAX_QR_REFRESH_COUNT) {
                        activeLogins.delete(opts.sessionKey);
                        return {
                            connected: false,
                            message: '多次输入错误，连接流程已停止。请稍后再试。'
                        };
                    }
                    const result = await refreshQRCode(activeLogin, opts.botType || DEFAULT_ILINK_BOT_TYPE, qrRefreshCount, () => {
                        scannedPrinted = false;
                    });
                    if (!result.success) {
                        activeLogins.delete(opts.sessionKey);
                        return { connected: false, message: result.message };
                    }
                    break;
                }
                case 'binded_redirect': {
                    logger.info('binded_redirect received, bot already bound');
                    process.stdout.write('\n✅ 已连接过，无需重复连接。\n');
                    activeLogins.delete(opts.sessionKey);
                    return {
                        connected: false,
                        alreadyConnected: true,
                        message: '已连接过，无需重复连接。'
                    };
                }
                case 'scaned_but_redirect': {
                    const redirectHost = statusResponse.redirect_host;
                    if (redirectHost) {
                        const newBaseUrl = `https://${redirectHost}`;
                        activeLogin.currentApiBaseUrl = newBaseUrl;
                        logger.info(`IDC redirect, switching to ${redirectHost}`);
                    }
                    break;
                }
                case 'confirmed': {
                    if (!statusResponse.ilink_bot_id) {
                        activeLogins.delete(opts.sessionKey);
                        logger.error('Login confirmed but ilink_bot_id missing');
                        return {
                            connected: false,
                            message: '登录失败：服务器未返回 ilink_bot_id。'
                        };
                    }

                    activeLogin.botToken = statusResponse.bot_token;
                    activeLogins.delete(opts.sessionKey);

                    logger.info(`✅ Login confirmed! ilink_bot_id=${statusResponse.ilink_bot_id}`);

                    return {
                        connected: true,
                        botToken: statusResponse.bot_token,
                        accountId: statusResponse.ilink_bot_id,
                        baseUrl: statusResponse.baseurl,
                        userId: statusResponse.ilink_user_id,
                        message: '已连接到微信。'
                    };
                }
            }
        } catch (err) {
            logger.error(`Error polling QR status: ${String(err)}`);
            activeLogins.delete(opts.sessionKey);
            return {
                connected: false,
                message: `Login failed: ${String(err)}`
            };
        }

        await new Promise((r) => setTimeout(r, 1000));
    }

    logger.warn('Timed out waiting for QR scan');
    activeLogins.delete(opts.sessionKey);
    return {
        connected: false,
        message: '登录超时，请重试。'
    };
}
