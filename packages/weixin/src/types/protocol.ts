/**
 * 微信 iLink 协议类型定义
 * 提取自 @tencent-weixin/openclaw-weixin，去掉 openclaw 依赖
 */

/** 通用请求元数据，附加到每个 CGI 请求 */
export interface BaseInfo {
    channel_version?: string;
    bot_agent?: string;
}

/** CDN 上传媒体类型 */
export const UploadMediaType = {
    IMAGE: 1,
    VIDEO: 2,
    FILE: 3,
    VOICE: 4
} as const;

export interface GetUploadUrlReq {
    filekey?: string;
    media_type?: number;
    to_user_id?: string;
    rawsize?: number;
    rawfilemd5?: string;
    filesize?: number;
    thumb_rawsize?: number;
    thumb_rawfilemd5?: string;
    thumb_filesize?: number;
    no_need_thumb?: boolean;
    aeskey?: string;
}

export interface GetUploadUrlResp {
    upload_param?: string;
    thumb_upload_param?: string;
    upload_full_url?: string;
}

export const MessageType = {
    NONE: 0,
    USER: 1,
    BOT: 2
} as const;

export const MessageItemType = {
    NONE: 0,
    TEXT: 1,
    IMAGE: 2,
    VOICE: 3,
    FILE: 4,
    VIDEO: 5,
    TOOL_CALL_START: 11,
    TOOL_CALL_RESULT: 12
} as const;

export const MessageState = {
    NEW: 0,
    GENERATING: 1,
    FINISH: 2
} as const;

export interface TextItem {
    text?: string;
}

/** CDN 媒体引用；JSON 中 aes_key 为 base64 编码 */
export interface CDNMedia {
    encrypt_query_param?: string;
    aes_key?: string;
    encrypt_type?: number;
    full_url?: string;
}

export interface ImageItem {
    media?: CDNMedia;
    thumb_media?: CDNMedia;
    aeskey?: string;
    url?: string;
    mid_size?: number;
    thumb_size?: number;
    thumb_height?: number;
    thumb_width?: number;
    hd_size?: number;
}

export interface VoiceItem {
    media?: CDNMedia;
    encode_type?: number;
    bits_per_sample?: number;
    sample_rate?: number;
    playtime?: number;
    /** 语音转文字结果 */
    text?: string;
}

export interface FileItem {
    media?: CDNMedia;
    file_name?: string;
    md5?: string;
    len?: string;
}

export interface VideoItem {
    media?: CDNMedia;
    video_size?: number;
    play_length?: number;
    video_md5?: string;
    thumb_media?: CDNMedia;
    thumb_size?: number;
    thumb_height?: number;
    thumb_width?: number;
}

export interface RefMessage {
    message_item?: MessageItem;
    title?: string;
}

export interface ToolCallStartItem {
    tool_name?: string;
    tool_call_id?: string;
}

export interface ToolCallResultItem {
    tool_name?: string;
    tool_call_id?: string;
    status?: string;
}

export interface MessageItem {
    type?: number;
    create_time_ms?: number;
    update_time_ms?: number;
    is_completed?: boolean;
    msg_id?: string;
    ref_msg?: RefMessage;
    text_item?: TextItem;
    image_item?: ImageItem;
    voice_item?: VoiceItem;
    file_item?: FileItem;
    video_item?: VideoItem;
    tool_call_start_item?: ToolCallStartItem;
    tool_call_result_item?: ToolCallResultItem;
}

/** 统一消息结构 (proto: WeixinMessage) */
export interface WeixinMessage {
    seq?: number;
    message_id?: number;
    from_user_id?: string;
    to_user_id?: string;
    client_id?: string;
    create_time_ms?: number;
    update_time_ms?: number;
    delete_time_ms?: number;
    session_id?: string;
    group_id?: string;
    message_type?: number;
    message_state?: number;
    item_list?: MessageItem[];
    context_token?: string;
    run_id?: string;
}

/** GetUpdates 请求 */
export interface GetUpdatesReq {
    get_updates_buf?: string;
}

/** GetUpdates 响应 */
export interface GetUpdatesResp {
    ret?: number;
    errcode?: number;
    errmsg?: string;
    msgs?: WeixinMessage[];
    get_updates_buf?: string;
    longpolling_timeout_ms?: number;
}

/** SendMessage 请求 */
export interface SendMessageReq {
    msg?: WeixinMessage;
}

/** 输入状态 */
export const TypingStatus = {
    TYPING: 1,
    CANCEL: 2
} as const;

export interface SendTypingReq {
    ilink_user_id?: string;
    typing_ticket?: string;
    status?: number;
}

export interface SendTypingResp {
    ret?: number;
    errmsg?: string;
}

export interface GetConfigResp {
    ret?: number;
    errmsg?: string;
    typing_ticket?: string;
}

export interface NotifyStopResp {
    ret?: number;
    errmsg?: string;
}

export interface NotifyStartResp {
    ret?: number;
    errmsg?: string;
}
