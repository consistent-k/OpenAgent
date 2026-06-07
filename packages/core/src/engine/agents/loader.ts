import fs from 'node:fs';
import path from 'node:path';
import { agentRegistry, registerBuiltinAgents, parseAgentsMarkdown, type AgentDefinition } from '@oagent/agents';
import { CONFIG_PATH, type UserAgentConfig } from '@/config';
import { readJsonFile } from '@/utils/fs';

/**
 * Load all agent definitions from all sources.
 * Order: builtin → project (AGENTS.md) → user-config (config.json) → plugins
 * Later sources override earlier ones with the same ID.
 */
export async function loadAllAgents(): Promise<void> {
    agentRegistry.clear();
    registerBuiltinAgents();
    loadProjectAgents();

    // Read config once for both user agents and plugins
    const config = readJsonFile<{ agents?: UserAgentConfig[]; agentPlugins?: string[] }>(CONFIG_PATH);
    loadUserConfigAgents(config?.agents);
    await loadAgentPlugins(config?.agentPlugins);
}

function loadProjectAgents(): void {
    try {
        const workDir = process.env.OPENAGENT_WORK_DIR || process.cwd();
        const agentsPath = path.join(workDir, 'AGENTS.md');
        if (!fs.existsSync(agentsPath)) return;

        const content = fs.readFileSync(agentsPath, 'utf-8');
        const agents = parseAgentsMarkdown(content);
        agentRegistry.registerAll(agents);
    } catch {
        // Silently ignore — same behavior as existing AGENTS.md reading
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
                model: ua.model,
                maxSteps: ua.maxSteps,
                maxRetries: ua.maxRetries,
                source: 'user-config',
                requireApproval: ua.requireApproval,
                tags: ua.tags
            };
            agentRegistry.register(agent);
        }
    } catch {
        // Silently ignore config read errors
    }
}

/**
 * Load agent plugins from config.json's agentPlugins field.
 * Each plugin package must export a `register(registry)` function.
 */
async function loadAgentPlugins(pluginPkgs?: string[]): Promise<void> {
    if (!pluginPkgs || pluginPkgs.length === 0) return;
    try {
        for (const pkgName of pluginPkgs) {
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
            } catch {
                // Silently ignore plugin load errors
            }
        }
    } catch {
        // Silently ignore
    }
}
