/**
 * iLink API Endpoint 函数
 * 各 endpoint 的具体实现，依赖 client.ts 的 HTTP 封装
 */
import type { GetUpdatesReq, GetUpdatesResp, GetUploadUrlReq, GetUploadUrlResp, SendMessageReq, SendTypingReq, GetConfigResp, NotifyStopResp, NotifyStartResp } from '../types/protocol';
import { logger } from '../utils/logger';
import { apiPostFetch, buildBaseInfo } from './client';
import type { WeixinApiOptions } from './client';

export const DEFAULT_LONG_POLL_TIMEOUT_MS = 35_000;
const DEFAULT_API_TIMEOUT_MS = 15_000;
const DEFAULT_CONFIG_TIMEOUT_MS = 10_000;

/** POST 请求并解析 JSON 响应 */
async function apiPostJson<T>(params: { baseUrl: string; endpoint: string; body: Record<string, unknown>; token?: string; timeoutMs?: number; label: string }): Promise<T> {
    const rawText = await apiPostFetch({
        baseUrl: params.baseUrl,
        endpoint: params.endpoint,
        body: JSON.stringify({ ...params.body, base_info: buildBaseInfo() }),
        token: params.token,
        timeoutMs: params.timeoutMs,
        label: params.label
    });
    return JSON.parse(rawText) as T;
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
    return apiPostJson<GetConfigResp>({
        baseUrl: params.baseUrl,
        endpoint: 'ilink/bot/getconfig',
        body: { ilink_user_id: params.ilinkUserId, context_token: params.contextToken },
        token: params.token,
        timeoutMs: params.timeoutMs ?? DEFAULT_CONFIG_TIMEOUT_MS,
        label: 'getConfig'
    });
}

/** 发送输入状态指示 */
export async function sendTyping(params: WeixinApiOptions & { body: SendTypingReq }): Promise<void> {
    await apiPostFetch({
        baseUrl: params.baseUrl,
        endpoint: 'ilink/bot/sendtyping',
        body: JSON.stringify({ ...params.body, base_info: buildBaseInfo() }),
        token: params.token,
        timeoutMs: params.timeoutMs ?? DEFAULT_CONFIG_TIMEOUT_MS,
        label: 'sendTyping'
    });
}

/** 通知服务端客户端停止 */
export async function notifyStop(params: WeixinApiOptions): Promise<NotifyStopResp> {
    return apiPostJson<NotifyStopResp>({
        baseUrl: params.baseUrl,
        endpoint: 'ilink/bot/msg/notifystop',
        body: {},
        token: params.token,
        timeoutMs: params.timeoutMs ?? DEFAULT_CONFIG_TIMEOUT_MS,
        label: 'notifyStop'
    });
}

/** 通知服务端客户端启动 */
export async function notifyStart(params: WeixinApiOptions): Promise<NotifyStartResp> {
    return apiPostJson<NotifyStartResp>({
        baseUrl: params.baseUrl,
        endpoint: 'ilink/bot/msg/notifystart',
        body: {},
        token: params.token,
        timeoutMs: params.timeoutMs ?? DEFAULT_CONFIG_TIMEOUT_MS,
        label: 'notifyStart'
    });
}
