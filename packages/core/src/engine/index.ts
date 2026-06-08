/** Engine 模块统一导出 */

// runAgent — channel 插件等无 UI 场景用
export { runAgent, ensureAgentsLoaded, reloadAgents } from './agents';

// Provider & System Prompt（供外部按需使用）
export { getProvider } from './config/provider';
export { getSystemPrompt, resetSystemPromptCache } from './config/system-prompt';

// Agent Registry（从 @oagent/agents 重新导出）
export { agentRegistry } from '@oagent/agents';
export { setAgentEventEmitter, abortAll } from './agents/agent-tool';

// 子代理实时活动 store
export { getAgentActivity, subscribeAgentActivity, clearAgentActivity, type AgentActivity, type AgentStep } from './agents/agent-activity-store';
