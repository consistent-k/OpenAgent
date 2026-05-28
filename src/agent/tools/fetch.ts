import dns from 'node:dns/promises';
import net from 'node:net';
import { tool } from 'ai';
import axios from 'axios';
import { z } from 'zod';

function isPrivateIPv4(address: string): boolean {
    const parts = address.split('.').map(Number);
    if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;
    const [a, b] = parts;
    return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || a === 0;
}

function isPrivateIPv6(address: string): boolean {
    const normalized = address.toLowerCase();
    return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:') || normalized === '::';
}

function isBlockedAddress(address: string): boolean {
    const family = net.isIP(address);
    if (family === 4) return isPrivateIPv4(address);
    if (family === 6) return isPrivateIPv6(address);
    return false;
}

async function assertPublicHttpUrl(url: string): Promise<void> {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('仅支持 http 和 https URL');
    }

    if (parsed.hostname === 'localhost' || parsed.hostname.endsWith('.localhost')) {
        throw new Error('不允许请求 localhost 地址');
    }

    if (net.isIP(parsed.hostname)) {
        if (isBlockedAddress(parsed.hostname)) {
            throw new Error('不允许请求内网或本机地址');
        }
        return;
    }

    const addresses = await dns.lookup(parsed.hostname, { all: true });
    if (addresses.some(({ address }) => isBlockedAddress(address))) {
        throw new Error('不允许请求解析到内网或本机的地址');
    }
}

export const fetchTool = tool({
    description: '获取公开 http/https URL 的响应文本或 JSON，用于读取外部网页/API 内容；可传入 prompt 指定关注点以聚焦相关段落。会阻止 localhost、内网地址和重定向，响应体有限制。',
    inputSchema: z.object({
        url: z.string().url().describe('要请求的公开 http/https URL，不能指向 localhost 或内网地址'),
        method: z.enum(['GET', 'POST']).optional().describe('HTTP 方法，默认 GET'),
        headers: z.record(z.string(), z.string()).optional().describe('可选 HTTP 请求头；默认会带 AgentFetch User-Agent'),
        body: z.string().optional().describe('POST 请求体；GET 请求会忽略该字段'),
        prompt: z.string().optional().describe('对获取内容的关注点描述，帮助聚焦相关信息，如 "查找 API 接口定义"、"提取版本号"')
    }),
    execute: async ({ url, method = 'GET', headers, body, prompt }) => {
        try {
            await assertPublicHttpUrl(url);
            const response = await axios({
                url,
                method,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; AgentFetch/1.0)',
                    ...headers
                },
                data: method === 'POST' ? body : undefined,
                timeout: 30000,
                maxRedirects: 5,
                maxContentLength: 1024 * 1024,
                validateStatus: (status) => status >= 200 && status < 400
            });

            const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);

            const result: Record<string, unknown> = {
                url,
                status: response.status,
                statusText: response.statusText,
                contentType: response.headers['content-type'] || '',
                content: content.substring(0, 50000),
                contentLength: Buffer.byteLength(content, 'utf-8'),
                truncated: content.length > 50000
            };

            if (prompt) {
                result.prompt = prompt;
                // 在内容中搜索与 prompt 关键词相关的段落
                const keywords = prompt
                    .toLowerCase()
                    .split(/[\s,，、]+/)
                    .filter((k) => k.length > 1);
                if (keywords.length > 0) {
                    const contentLower = content.toLowerCase();
                    const relevantParts: string[] = [];
                    for (const kw of keywords) {
                        const idx = contentLower.indexOf(kw);
                        if (idx !== -1) {
                            const start = Math.max(0, idx - 200);
                            const end = Math.min(content.length, idx + kw.length + 200);
                            relevantParts.push(`...${content.slice(start, end).trim()}...`);
                        }
                    }
                    if (relevantParts.length > 0) {
                        result.focusedContent = [...new Set(relevantParts)].slice(0, 5).join('\n---\n');
                    }
                }
            }

            return result;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`获取网页内容失败：${error.message}`);
            }
            throw new Error(`获取网页内容失败：${error instanceof Error ? error.message : String(error)}`);
        }
    }
});
