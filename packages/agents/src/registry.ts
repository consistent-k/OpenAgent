import type { AgentDefinition, AgentSource } from './types';

/**
 * Singleton registry that manages all agent definitions.
 * Agents are loaded in priority order: builtin → project → user-config.
 * Later registrations with the same ID override earlier ones.
 */
export class AgentRegistry {
    private agents = new Map<string, AgentDefinition>();

    /** Register or update an agent definition */
    register(agent: AgentDefinition): void {
        this.agents.set(agent.id, agent);
    }

    /** Register multiple agents at once */
    registerAll(agents: AgentDefinition[]): void {
        for (const agent of agents) {
            this.register(agent);
        }
    }

    /** Get an agent by ID */
    get(id: string): AgentDefinition | undefined {
        return this.agents.get(id);
    }

    /** Get all registered agents */
    getAll(): AgentDefinition[] {
        return Array.from(this.agents.values());
    }

    /** Get agents filtered by source */
    getBySource(source: AgentSource): AgentDefinition[] {
        return this.getAll().filter((a) => a.source === source);
    }

    /** Get agents filtered by tag */
    getByTag(tag: string): AgentDefinition[] {
        return this.getAll().filter((a) => a.tags?.includes(tag));
    }

    /** Remove an agent by ID */
    unregister(id: string): boolean {
        return this.agents.delete(id);
    }

    /** Clear all agents from a specific source (used during reload) */
    clearBySource(source: AgentSource): void {
        for (const [id, agent] of this.agents) {
            if (agent.source === source) {
                this.agents.delete(id);
            }
        }
    }

    /** Clear everything */
    clear(): void {
        this.agents.clear();
    }

    /** Get summaries for system prompt injection */
    getAgentSummaries(): Array<{ id: string; name: string; description: string }> {
        return this.getAll().map((a) => ({
            id: a.id,
            name: a.name,
            description: a.description
        }));
    }
}

/** Singleton instance */
export const agentRegistry = new AgentRegistry();
