import fs from 'node:fs';
import path from 'node:path';
import { agentRegistry, registerBuiltinAgents, parseAgentsMarkdown, type AgentDefinition } from '@oagent/agents';
import { getConfiguredAgents, getConfiguredAgentPlugins, type UserAgentConfig } from '@/config';

/**
 * Load all agent definitions from all sources.
 * Order: builtin → project (AGENTS.md) → user-config (config.json) → plugins
 * Later sources override earlier ones with the same ID.
 */
export async function loadAllAgents(): Promise<void> {
    agentRegistry.clear();
    registerBuiltinAgents();
    loadProjectAgents();

    // Use cached config getters (avoids redundant file I/O)
    loadUserConfigAgents(getConfiguredAgents());
    await loadAgentPlugins(getConfiguredAgentPlugins());
}

function loadProjectAgents(): void {
    try {
        const workDir = process.env.OPENAGENT_WORK_DIR || process.cwd();
        const agentsPath = path.join(workDir, 'AGENTS.md');
        if (!fs.existsSync(agentsPath)) return;

        const content = fs.readFileSync(agentsPath, 'utf-8');
        const agents = parseAgentsMarkdown(content);
        agentRegistry.registerAll(agents);
    } catch (err) {
        console.warn('[agents] Failed to load project AGENTS.md:', err);
    }
}

function loadUserConfigAgents(agents?: UserAgentConfig[]): void {
    if (!agents) return;
    try {
        for (const ua of agents) {
            const agent: AgentDefinition = {
                id: ua.id,
                name: ua.name ?? ua.id,
                description: ua.description ?? '',
                systemPrompt: ua.systemPrompt,
                allowedTools: ua.allowedTools,
                disallowedTools: ua.disallowedTools,
                model: ua.model,
                maxSteps: ua.maxSteps,
                maxRetries: ua.maxRetries,
                source: 'user-config',
                requireApproval: ua.requireApproval,
                tags: ua.tags
            };
            agentRegistry.register(agent);
        }
    } catch (err) {
        console.warn('[agents] Failed to load user-config agents:', err);
    }
}

/**
 * Load agent plugins from config.json's agentPlugins field.
 * Each plugin package must export a `register(registry)` function.
 */
/** 校验是否为合法 npm 包名（防止路径穿越） */
function isValidPackageName(name: string): boolean {
    // npm 包名规则：允许 @scope/name 或 name，不能包含 .. / \ 等
    return /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name) && !name.includes('..');
}

async function loadAgentPlugins(pluginPkgs?: string[]): Promise<void> {
    if (!pluginPkgs || pluginPkgs.length === 0) return;
    for (const pkgName of pluginPkgs) {
        if (!isValidPackageName(pkgName)) {
            console.warn(`[agents] Skipping invalid plugin package name: "${pkgName}"`);
            continue;
        }
        try {
            let mod;
            try {
                mod = await import(pkgName);
            } catch {
                // Global not found, try local node_modules
                const localPath = path.resolve(process.cwd(), 'node_modules', pkgName, 'dist', 'index.js');
                mod = await import(localPath);
            }
            if (typeof mod.register === 'function') {
                mod.register(agentRegistry);
            }
        } catch (err) {
            console.warn(`[agents] Failed to load plugin "${pkgName}":`, err);
        }
    }
}
