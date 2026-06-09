/** Agent definition source */
export type AgentSource = 'builtin' | 'project' | 'user-config';

/**
 * Core agent definition. Describes what an agent is, how it behaves,
 * and what tools it can use.
 */
export interface AgentDefinition {
    /** Unique identifier, e.g. "researcher", "code-reviewer" */
    id: string;
    /** Human-readable name for display in TUI */
    name: string;
    /** Short description shown to the parent agent and in the system prompt */
    description: string;
    /** The system prompt for this agent */
    systemPrompt: string;
    /** Tool names this agent is allowed to use. undefined = all tools */
    allowedTools?: string[];
    /** Tool names this agent is NOT allowed to use (denylist). Takes precedence over allowedTools */
    disallowedTools?: string[];
    /** Model override in "Provider/Model" format. undefined = global active model */
    model?: string;
    /** Max steps override. undefined = global maxSteps */
    maxSteps?: number;
    /** Max retries for API calls. Defaults to 10 */
    maxRetries?: number;
    /** Where this agent definition was loaded from */
    source: AgentSource;
    /** Whether sub-tool calls need approval */
    requireApproval?: boolean;
    /** Tags for filtering/grouping */
    tags?: string[];
}

/** Result of a sub-agent execution */
export interface AgentResult {
    /** The agent that produced this result */
    agentId: string;
    /** Final text output */
    text: string;
    /** Whether the agent completed successfully */
    completed: boolean;
    /** Token usage */
    usage?: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };
    /** Number of agentic loop steps taken */
    stepsUsed: number;
}

/** Callback interface for TUI to observe sub-agent activity */
export interface AgentEventEmitter {
    onAgentStart(agentId: string, runId: string): void;
    onAgentText(agentId: string, runId: string, textDelta: string): void;
    onAgentToolCall(agentId: string, runId: string, toolName: string, input: unknown): void;
    onAgentToolResult(agentId: string, runId: string, toolName: string, result: unknown): void;
    onAgentEnd(agentId: string, runId: string, result: AgentResult): void;
    onAgentError(agentId: string, runId: string, error: string): void;
}
