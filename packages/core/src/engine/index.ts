/** Engine 模块统一导出 */

// runAgent — channel 插件等无 UI 场景用
export { runAgent } from './agents';

// Provider & System Prompt（供外部按需使用）
export { getProvider } from './config/provider';
export { getSystemPrompt } from './config/system-prompt';
