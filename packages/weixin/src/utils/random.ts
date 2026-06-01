/**
 * 唯一 ID 生成工具
 * 提取自 @tencent-weixin/openclaw-weixin/src/util/random.ts
 */
import crypto from 'node:crypto';

/**
 * 生成带前缀的唯一 ID
 * 格式: `{prefix}:{timestamp}-{8位hex}`
 */
export function generateId(prefix: string): string {
    return `${prefix}:${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}
