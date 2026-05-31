/**
 * 微信 iLink API 客户端
 * 提取自 @tencent-weixin/openclaw-weixin/src/api/api.ts，去掉 openclaw 依赖
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from './logger.js';
import { redactBody, redactUrl } from './redact.js';
import type { BaseInfo, GetUploadUrlReq, GetUploadUrlResp, GetUpdatesReq, GetUpdatesResp, NotifyStopResp, NotifyStartResp, SendMessageReq, SendTypingReq, GetConfigResp } from './types.js';

export type WeixinApiOptions = {
    baseUrl: string;
    token?: string;
    timeoutMs?: number;
    longPollTimeoutMs?: number;
};

// ---------------------------------------------------------------------------
// BaseInfo — 附加到每个 CGI 请求
// ---------------------------------------------------------------------------

interface PackageJson {
    name?: string;
    version?: string;
}

function readPackageJson(): PackageJson {
    try {
        // 从当前文件向上查找 package.json
        let dir = path.dirname(fileURLToPath(import.meta.url));
        const { root } = path.parse(dir);
        while (dir && dir !== root) {
            const candidate = path.join(dir, 'package.json');
            if (fs.existsSync(candidate)) {
                const parsed = JSON.parse(fs.readFileSync(candidate, 'utf-8')) as PackageJson;
                if (parsed.name === 'openagent' || parsed.name?.includes('openagent')) {
                    return parsed;
                }
            }
            dir = path.dirname(dir);
        }
    } catch {
        // ignore
    }
    return {};
}

const pkg = readPackageJson();
const CHANNEL_VERSION = pkg.version ?? 'unknown';

/** 默认 bot_agent */
const DEFAULT_BOT_AGENT = 'OpenAgent';
const BOT_AGENT_MAX_LEN = 256;

/**
 * 清洗 botAgent 配置值为安全的 wire 格式
 */
export function sanitizeBotAgent(raw: string | undefined): string {
    if (!raw || typeof raw !== 'string') return DEFAULT_BOT_AGENT;
    const trimmed = raw.trim();
    if (!trimmed) return DEFAULT_BOT_AGENT;

    const productRe = /^[A-Za-z0-9_.\-]{1,32}\/[A-Za-z0-9_.+\-]{1,32}$/;
    const commentCharRe = /^[\x20-\x27\x2A-\x7E]{1,64}$/;

    const rawTokens = trimmed.split(/\s+/);
    const tokens: string[] = [];
    for (let i = 0; i < rawTokens.length; i++) {
        const tok = rawTokens[i];
        if (tok.startsWith('(') && !tok.endsWith(')')) {
            let acc = tok;
            while (i + 1 < rawTokens.length && !acc.endsWith(')')) {
                i++;
                acc += ' ' + rawTokens[i];
            }
            tokens.push(acc);
        } else {
            tokens.push(tok);
        }
    }

    const accepted: string[] = [];
    let pendingProduct: string | null = null;
    for (const tok of tokens) {
        if (tok.startsWith('(') && tok.endsWith(')')) {
            const inner = tok.slice(1, -1);
            if (pendingProduct && commentCharRe.test(inner)) {
                accepted.push(`${pendingProduct} (${inner})`);
                pendingProduct = null;
            } else {
                if (pendingProduct) {
                    accepted.push(pendingProduct);
                    pendingProduct = null;
                }
            }
            continue;
        }
        if (pendingProduct) {
            accepted.push(pendingProduct);
            pendingProduct = null;
        }
        if (productRe.test(tok)) {
            pendingProduct = tok;
        }
    }
    if (pendingProduct) accepted.push(pendingProduct);
    if (accepted.length === 0) return DEFAULT_BOT_AGENT;

    const joined = accepted.join(' ');
    if (Buffer.byteLength(joined, 'utf-8') <= BOT_AGENT_MAX_LEN) return joined;

    const truncated: string[] = [];
    let len = 0;
    for (const t of accepted) {
        const add = (truncated.length === 0 ? 0 : 1) + Buffer.byteLength(t, 'utf-8');
        if (len + add > BOT_AGENT_MAX_LEN) break;
        truncated.push(t);
        len += add;
    }
    return truncated.length > 0 ? truncated.join(' ') : DEFAULT_BOT_AGENT;
}

/** 构建 base_info 负载 */
export function buildBaseInfo(): BaseInfo {
    return {
        channel_version: CHANNEL_VERSION,
        bot_agent: sanitizeBotAgent(undefined)
    };
}

const DEFAULT_LONG_POLL_TIMEOUT_MS = 35_000;
const DEFAULT_API_TIMEOUT_MS = 15_000;
const DEFAULT_CONFIG_TIMEOUT_MS = 10_000;

function ensureTrailingSlash(url: string): string {
    return url.endsWith('/') ? url : `${url}/`;
}

/** X-WECHAT-UIN header: random uint32 -> decimal string -> base64 */
function randomWechatUin(): string {
    const uint32 = crypto.randomBytes(4).readUInt32BE(0);
    return Buffer.from(String(uint32), 'utf-8').toString('base64');
}

function buildHeaders(opts: { token?: string }): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        AuthorizationType: 'ilink_bot_token',
        'X-WECHAT-UIN': randomWechatUin()
    };
    if (opts.token?.trim()) {
        headers.Authorization = `Bearer ${opts.token.trim()}`;
    }
    return headers;
}

function buildCommonHeaders(): Record<string, string> {
    return {};
}

/**
 * GET 请求封装
 */
export async function apiGetFetch(params: { baseUrl: string; endpoint: string; timeoutMs?: number; label: string }): Promise<string> {
    const base = ensureTrailingSlash(params.baseUrl);
    const url = new URL(params.endpoint, base);
    const hdrs = buildCommonHeaders();
    logger.debug(`GET ${redactUrl(url.toString())}`);

    const timeoutMs = params.timeoutMs;
    const controller = timeoutMs != null && timeoutMs > 0 ? new AbortController() : undefined;
    const t = controller != null && timeoutMs != null ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
    try {
        const res = await fetch(url.toString(), {
            method: 'GET',
            headers: hdrs,
            ...(controller ? { signal: controller.signal } : {})
        });
        if (t !== undefined) clearTimeout(t);
        const rawText = await res.text();
        logger.debug(`${params.label} status=${res.status} raw=${redactBody(rawText)}`);
        if (!res.ok) {
            throw new Error(`${params.label} ${res.status}: ${rawText}`);
        }
        return rawText;
    } catch (err) {
        if (t !== undefined) clearTimeout(t);
        throw err;
    }
}

/**
 * 合并内部超时控制器和外部 abort signal
 */
function combineAbortSignals(params: { internal?: AbortController; external?: AbortSignal }): { signal?: AbortSignal; cleanup: () => void } {
    const { internal, external } = params;
    if (!external) {
        return { signal: internal?.signal, cleanup: () => {} };
    }
    if (!internal) {
        return { signal: external, cleanup: () => {} };
    }
    if (external.aborted) {
        internal.abort();
        return { signal: internal.signal, cleanup: () => {} };
    }
    const onExternalAbort = () => internal.abort();
    external.addEventListener('abort', onExternalAbort, { once: true });
    return {
        signal: internal.signal,
        cleanup: () => external.removeEventListener('abort', onExternalAbort)
    };
}

/**
 * POST JSON 请求封装
 */
export async function apiPostFetch(params: { baseUrl: string; endpoint: string; body: string; token?: string; timeoutMs?: number; label: string; abortSignal?: AbortSignal }): Promise<string> {
    const base = ensureTrailingSlash(params.baseUrl);
    const url = new URL(params.endpoint, base);
    const hdrs = buildHeaders({ token: params.token });
    logger.debug(`POST ${redactUrl(url.toString())} body=${redactBody(params.body)}`);

    const controller = params.timeoutMs !== undefined ? new AbortController() : undefined;
    const t = controller != null && params.timeoutMs !== undefined ? setTimeout(() => controller.abort(), params.timeoutMs) : undefined;
    const { signal, cleanup } = combineAbortSignals({
        internal: controller,
        external: params.abortSignal
    });
    try {
        const res = await fetch(url.toString(), {
            method: 'POST',
            headers: hdrs,
            body: params.body,
            ...(signal ? { signal } : {})
        });
        if (t !== undefined) clearTimeout(t);
        const rawText = await res.text();
        logger.debug(`${params.label} status=${res.status} raw=${redactBody(rawText)}`);
        if (!res.ok) {
            throw new Error(`${params.label} ${res.status}: ${rawText}`);
        }
        return rawText;
    } catch (err) {
        if (t !== undefined) clearTimeout(t);
        throw err;
    } finally {
        cleanup();
    }
}

/**
 * 长轮询 getUpdates
 */
export async function getUpdates(
    params: GetUpdatesReq & {
        baseUrl: string;
        token?: string;
        timeoutMs?: number;
        abortSignal?: AbortSignal;
    }
): Promise<GetUpdatesResp> {
    const timeout = params.timeoutMs ?? DEFAULT_LONG_POLL_TIMEOUT_MS;
    try {
        const rawText = await apiPostFetch({
            baseUrl: params.baseUrl,
            endpoint: 'ilink/bot/getupdates',
            body: JSON.stringify({
                get_updates_buf: params.get_updates_buf ?? '',
                base_info: buildBaseInfo()
            }),
            token: params.token,
            timeoutMs: timeout,
            label: 'getUpdates',
            abortSignal: params.abortSignal
        });
        return JSON.parse(rawText) as GetUpdatesResp;
    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
            if (params.abortSignal?.aborted) {
                logger.debug('getUpdates: aborted by external signal');
            } else {
                logger.debug(`getUpdates: client-side timeout after ${timeout}ms`);
            }
            return {
                ret: 0,
                msgs: [],
                get_updates_buf: params.get_updates_buf
            };
        }
        throw err;
    }
}

/** 获取 CDN 上传预签名 URL */
export async function getUploadUrl(params: GetUploadUrlReq & WeixinApiOptions): Promise<GetUploadUrlResp> {
    const rawText = await apiPostFetch({
        baseUrl: params.baseUrl,
        endpoint: 'ilink/bot/getuploadurl',
        body: JSON.stringify({
            filekey: params.filekey,
            media_type: params.media_type,
            to_user_id: params.to_user_id,
            rawsize: params.rawsize,
            rawfilemd5: params.rawfilemd5,
            filesize: params.filesize,
            thumb_rawsize: params.thumb_rawsize,
            thumb_rawfilemd5: params.thumb_rawfilemd5,
            thumb_filesize: params.thumb_filesize,
            no_need_thumb: params.no_need_thumb,
            aeskey: params.aeskey,
            base_info: buildBaseInfo()
        }),
        token: params.token,
        timeoutMs: params.timeoutMs ?? DEFAULT_API_TIMEOUT_MS,
        label: 'getUploadUrl'
    });
    return JSON.parse(rawText) as GetUploadUrlResp;
}

/** 发送消息 */
export async function sendMessage(params: WeixinApiOptions & { body: SendMessageReq }): Promise<void> {
    await apiPostFetch({
        baseUrl: params.baseUrl,
        endpoint: 'ilink/bot/sendmessage',
        body: JSON.stringify({ ...params.body, base_info: buildBaseInfo() }),
        token: params.token,
        timeoutMs: params.timeoutMs ?? DEFAULT_API_TIMEOUT_MS,
        label: 'sendMessage'
    });
}

/** 获取账号配置（typing ticket） */
export async function getConfig(
    params: WeixinApiOptions & {
        ilinkUserId: string;
        contextToken?: string;
    }
): Promise<GetConfigResp> {
    const rawText = await apiPostFetch({
        baseUrl: params.baseUrl,
        endpoint: 'ilink/bot/getconfig',
        body: JSON.stringify({
            ilink_user_id: params.ilinkUserId,
            context_token: params.contextToken,
            base_info: buildBaseInfo()
        }),
        token: params.token,
        timeoutMs: params.timeoutMs ?? DEFAULT_CONFIG_TIMEOUT_MS,
        label: 'getConfig'
    });
    return JSON.parse(rawText) as GetConfigResp;
}

/** 发送输入状态指示 */
export async function sendTyping(params: WeixinApiOptions & { body: SendTypingReq }): Promise<void> {
    await apiPostFetch({
        baseUrl: params.baseUrl,
        endpoint: 'ilink/bot/sendtyping',
        body: JSON.stringify({
            ...params.body,
            base_info: buildBaseInfo()
        }),
        token: params.token,
        timeoutMs: params.timeoutMs ?? DEFAULT_CONFIG_TIMEOUT_MS,
        label: 'sendTyping'
    });
}

/** 通知服务端客户端停止 */
export async function notifyStop(params: WeixinApiOptions): Promise<NotifyStopResp> {
    const rawText = await apiPostFetch({
        baseUrl: params.baseUrl,
        endpoint: 'ilink/bot/msg/notifystop',
        body: JSON.stringify({ base_info: buildBaseInfo() }),
        token: params.token,
        timeoutMs: params.timeoutMs ?? DEFAULT_CONFIG_TIMEOUT_MS,
        label: 'notifyStop'
    });
    return JSON.parse(rawText) as NotifyStopResp;
}

/** 通知服务端客户端启动 */
export async function notifyStart(params: WeixinApiOptions): Promise<NotifyStartResp> {
    const rawText = await apiPostFetch({
        baseUrl: params.baseUrl,
        endpoint: 'ilink/bot/msg/notifystart',
        body: JSON.stringify({ base_info: buildBaseInfo() }),
        token: params.token,
        timeoutMs: params.timeoutMs ?? DEFAULT_CONFIG_TIMEOUT_MS,
        label: 'notifyStart'
    });
    return JSON.parse(rawText) as NotifyStartResp;
}
