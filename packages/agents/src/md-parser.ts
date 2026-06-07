import type { AgentDefinition } from './types';

/**
 * Parse structured agent definitions from AGENTS.md content.
 *
 * Format:
 * ````agents
 * [researcher]
 * name = Research Agent
 * description = Searches the web and summarizes findings
 * model = OpenAI/gpt-4o-mini
 * maxSteps = 5
 * allowedTools = web_search, fetch, read_file
 * tags = research, web
 * ---
 * You are a research assistant. Your job is to search the web
 * for relevant information and provide concise summaries.
 * ````
 *
 * Multiple agents in one block are separated by `[id]` headers.
 * The `---` separator divides properties from the system prompt.
 */
export function parseAgentsMarkdown(content: string): AgentDefinition[] {
    const agents: AgentDefinition[] = [];
    const blockRegex = /```agents\s*\n([\s\S]*?)```/g;
    let match: RegExpExecArray | null;

    while ((match = blockRegex.exec(content)) !== null) {
        const block = match[1]!.trim();
        const parsed = parseAgentBlock(block);
        agents.push(...parsed);
    }

    return agents;
}

function parseAgentBlock(block: string): AgentDefinition[] {
    const sections = splitByAgentHeaders(block);
    if (sections.length === 0) return [];

    return sections.map((s) => parseSingleAgent(s)).filter((a): a is AgentDefinition => a !== null);
}

interface AgentSection {
    id: string;
    body: string;
}

function splitByAgentHeaders(block: string): AgentSection[] {
    const sections: AgentSection[] = [];
    const headerRegex = /\[([a-zA-Z0-9_-]+)\]\s*\n([\s\S]*?)(?=\[[a-zA-Z0-9_-]+\]\s*\n|$)/g;
    let match: RegExpExecArray | null;

    while ((match = headerRegex.exec(block)) !== null) {
        sections.push({
            id: match[1]!,
            body: match[2]!.trim()
        });
    }

    // No [id] headers — treat the whole block as a single agent
    if (sections.length === 0 && block.length > 0) {
        sections.push({ id: 'project-agent', body: block });
    }

    return sections;
}

function parseSingleAgent(section: AgentSection): AgentDefinition | null {
    const { id, body } = section;

    const separatorIndex = body.indexOf('\n---\n');
    const headerPart = separatorIndex >= 0 ? body.slice(0, separatorIndex) : '';
    const systemPrompt = separatorIndex >= 0 ? body.slice(separatorIndex + 5).trim() : body;

    if (!systemPrompt) return null;

    const props = parseProperties(headerPart);

    return {
        id,
        name: props.name ?? id,
        description: props.description ?? '',
        systemPrompt,
        allowedTools: props.allowedTools
            ? props.allowedTools
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
            : undefined,
        model: props.model ?? undefined,
        maxSteps: props.maxSteps ? Number.parseInt(props.maxSteps, 10) : undefined,
        maxRetries: props.maxRetries ? Number.parseInt(props.maxRetries, 10) : undefined,
        source: 'project',
        requireApproval: props.requireApproval === 'true',
        tags: props.tags
            ? props.tags
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
            : undefined
    };
}

function parseProperties(header: string): Record<string, string> {
    const props: Record<string, string> = {};
    for (const line of header.split('\n')) {
        const eqIndex = line.indexOf('=');
        if (eqIndex < 0) continue;
        const key = line.slice(0, eqIndex).trim();
        const value = line.slice(eqIndex + 1).trim();
        if (key) props[key] = value;
    }
    return props;
}

/**
 * Extract non-agent content from AGENTS.md for backward-compatible
 * project context injection into the main system prompt.
 */
export function extractProjectContext(content: string): string {
    return content.replace(/```agents\s*\n[\s\S]*?```/g, '').trim();
}
