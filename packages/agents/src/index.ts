/**
 * @oagent/agents — Multi-agent abstraction layer for OpenAgent
 *
 * Provides agent types, registry, built-in agents, and AGENTS.md parsing.
 * Core package and external plugins both depend on this SDK.
 */
export type { AgentSource, AgentDefinition, AgentResult, AgentEventEmitter } from './types';
export { AgentRegistry, agentRegistry } from './registry';
export { registerBuiltinAgents } from './builtin';
export { parseAgentsMarkdown, extractProjectContext } from './md-parser';
