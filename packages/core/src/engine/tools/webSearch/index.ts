import { tool } from 'ai';
import axios from 'axios';
import { z } from 'zod';
import { getErrorMessage } from '@/utils/errors';

interface SearchResult {
    title: string;
    url: string;
    snippet: string;
}

function parseDuckDuckGoHtml(html: string, maxResults: number): SearchResult[] {
    const results: SearchResult[] = [];

    // Match DuckDuckGo HTML result blocks
    const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

    let match: RegExpExecArray | null;
    while ((match = resultRegex.exec(html)) !== null && results.length < maxResults) {
        let url = match[1];
        const title = match[2].replace(/<[^>]+>/g, '').trim();
        const snippet = match[3].replace(/<[^>]+>/g, '').trim();

        // DuckDuckGo links may be redirect URLs — try to extract the real URL
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
        throw new Error('Search API not configured');
    }

    const response = await axios.get(apiUrl, {
        params: { q: query, count: maxResults },
        headers: apiKey ? { 'X-Subscription-Token': apiKey, Accept: 'application/json' } : { Accept: 'application/json' },
        timeout: 15000
    });

    const data = response.data;

    // Try Brave Search response format
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

    // Try generic array format
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

    throw new Error('Unable to parse search API response format');
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
    description:
        'Search the web and use the results to inform your responses.\n\n' +
        '- Provides up-to-date information for current events and recent data\n' +
        '- Returns search results with titles, URLs, and snippets\n' +
        '- Use this tool for accessing information beyond your knowledge cutoff\n' +
        '- After answering, include a "Sources:" section listing relevant URLs as markdown links',
    inputSchema: z.object({
        query: z.string().min(2).describe('Search query. E.g., "React 19 new features" or "typescript generic constraints".'),
        max_results: z.number().int().min(1).max(10).optional().describe('Maximum number of results to return. Defaults to 5.')
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
                    message: 'No results found'
                };
            }

            return {
                query,
                results: result.results,
                provider: result.provider
            };
        } catch (error) {
            throw new Error(`Search failed: ${getErrorMessage(error)}`);
        }
    }
});
