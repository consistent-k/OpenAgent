import { tool } from 'ai';
import axios from 'axios';
import { z } from 'zod';

interface SearchResult {
    title: string;
    url: string;
    snippet: string;
}

function parseDuckDuckGoHtml(html: string, maxResults: number): SearchResult[] {
    const results: SearchResult[] = [];

    // 匹配 DuckDuckGo HTML 结果块
    const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

    let match: RegExpExecArray | null;
    while ((match = resultRegex.exec(html)) !== null && results.length < maxResults) {
        let url = match[1];
        const title = match[2].replace(/<[^>]+>/g, '').trim();
        const snippet = match[3].replace(/<[^>]+>/g, '').trim();

        // DuckDuckGo 的链接可能是重定向 URL，尝试提取真实 URL
        const uddgMatch = url.match(/[?&]uddg=([^&]+)/);
        if (uddgMatch) {
            url = decodeURIComponent(uddgMatch[1]);
        }

        if (title && url) {
            results.push({ title, url, snippet });
        }
    }

    return results;
}

async function searchViaApi(query: string, maxResults: number): Promise<{ results: SearchResult[]; provider: string }> {
    const apiUrl = process.env.OPENAGENT_SEARCH_API_URL;
    const apiKey = process.env.OPENAGENT_SEARCH_API_KEY;

    if (!apiUrl) {
        throw new Error('未配置搜索 API');
    }

    const response = await axios.get(apiUrl, {
        params: { q: query, count: maxResults },
        headers: apiKey ? { 'X-Subscription-Token': apiKey, Accept: 'application/json' } : { Accept: 'application/json' },
        timeout: 15000
    });

    const data = response.data;

    // 通用解析：尝试 Brave Search 格式
    if (data.web?.results) {
        return {
            results: data.web.results.slice(0, maxResults).map((r: { title: string; url: string; description?: string }) => ({
                title: r.title,
                url: r.url,
                snippet: r.description ?? ''
            })),
            provider: 'brave'
        };
    }

    // 尝试通用数组格式
    if (Array.isArray(data.results)) {
        return {
            results: data.results.slice(0, maxResults).map((r: { title: string; url: string; snippet?: string; description?: string }) => ({
                title: r.title,
                url: r.url,
                snippet: r.snippet ?? r.description ?? ''
            })),
            provider: 'custom-api'
        };
    }

    throw new Error('无法解析搜索 API 响应格式');
}

async function searchViaDuckDuckGo(query: string, maxResults: number): Promise<{ results: SearchResult[]; provider: string }> {
    const response = await axios.get('https://html.duckduckgo.com/html/', {
        params: { q: query },
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; AgentSearch/1.0)',
            Accept: 'text/html'
        },
        timeout: 15000,
        maxRedirects: 5
    });

    const results = parseDuckDuckGoHtml(response.data, maxResults);
    return { results, provider: 'duckduckgo' };
}

export const webSearchTool = tool({
    description: '搜索互联网获取实时信息。输入搜索查询词，返回相关网页的标题、链接和摘要。用于需要最新信息、文档查询或了解未知内容的场景。',
    inputSchema: z.object({
        query: z.string().min(2).describe('搜索查询词，如 "React 19 新特性" 或 "typescript generic constraints"'),
        max_results: z.number().int().min(1).max(10).optional().describe('最大结果数，默认 5')
    }),
    execute: async ({ query, max_results }) => {
        const maxResults = max_results ?? 5;

        try {
            let result: { results: SearchResult[]; provider: string };

            try {
                result = await searchViaApi(query, maxResults);
            } catch {
                result = await searchViaDuckDuckGo(query, maxResults);
            }

            if (result.results.length === 0) {
                return {
                    query,
                    results: [],
                    provider: result.provider,
                    message: '未找到相关结果'
                };
            }

            return {
                query,
                results: result.results,
                provider: result.provider
            };
        } catch (error) {
            throw new Error(`搜索失败：${error instanceof Error ? error.message : String(error)}`);
        }
    }
});
