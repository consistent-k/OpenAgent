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
        throw new Error('Only http and https URLs are supported');
    }

    if (parsed.hostname === 'localhost' || parsed.hostname.endsWith('.localhost')) {
        throw new Error('Requests to localhost are not allowed');
    }

    if (net.isIP(parsed.hostname)) {
        if (isBlockedAddress(parsed.hostname)) {
            throw new Error('Requests to private/loopback addresses are not allowed');
        }
        return;
    }

    const addresses = await dns.lookup(parsed.hostname, { all: true });
    if (addresses.some(({ address }) => isBlockedAddress(address))) {
        throw new Error('Hostname resolves to a private/loopback address');
    }
}

export const fetchTool = tool({
    description:
        'Fetch content from a public http/https URL.\n\n' +
        '- Returns the response text or JSON\n' +
        '- Use the optional `prompt` parameter to specify what information to extract from the content\n' +
        '- Blocks requests to localhost, private network addresses, and unsafe redirects\n' +
        '- For GitHub URLs, prefer using the gh CLI via execute_bash instead (e.g., gh pr view, gh issue view, gh api)',
    inputSchema: z.object({
        url: z.string().url().describe('A fully-formed public http/https URL. Must not point to localhost or private network addresses.'),
        method: z.enum(['GET', 'POST']).optional().describe('HTTP method. Defaults to GET.'),
        headers: z.record(z.string(), z.string()).optional().describe('Optional HTTP headers. A default User-Agent header is included.'),
        body: z.string().optional().describe('POST request body. Ignored for GET requests.'),
        prompt: z.string().optional().describe('Description of what information to extract from the content. E.g., "find API endpoint definitions" or "extract version numbers".')
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
                // Search for paragraphs related to prompt keywords
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
                throw new Error(`Failed to fetch URL: ${error.message}`);
            }
            throw new Error(`Failed to fetch URL: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
});
