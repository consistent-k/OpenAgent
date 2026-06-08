/**
 * 子代理实时活动 store
 *
 * 在 executeAgentRun 的流循环中写入，UI 层通过 useAgentActivity hook 订阅。
 * 以 toolCallId 为 key，支持并行子代理的复合 key。
 */

export interface AgentStep {
    toolName: string;
    input: string;
    output?: string;
}

export interface AgentActivity {
    text: string;
    steps: AgentStep[];
}

type Listener = (activity: AgentActivity) => void;

const store = new Map<string, AgentActivity>();
const listeners = new Map<string, Set<Listener>>();

/** 读取当前活动数据 */
export function getAgentActivity(toolCallId: string): AgentActivity | undefined {
    return store.get(toolCallId);
}

/** 更新活动数据并通知订阅者 */
export function updateAgentActivity(toolCallId: string, updater: (prev: AgentActivity) => AgentActivity): void {
    const prev = store.get(toolCallId) ?? { text: '', steps: [] };
    const next = updater(prev);
    store.set(toolCallId, next);
    listeners.get(toolCallId)?.forEach((cb) => cb(next));
}

/** 订阅活动变化，返回 unsubscribe */
export function subscribeAgentActivity(toolCallId: string, callback: Listener): () => void {
    if (!listeners.has(toolCallId)) {
        listeners.set(toolCallId, new Set());
    }
    listeners.get(toolCallId)!.add(callback);
    return () => {
        const set = listeners.get(toolCallId);
        if (set) {
            set.delete(callback);
            if (set.size === 0) listeners.delete(toolCallId);
        }
    };
}

/** 清理 store 条目 */
export function clearAgentActivity(toolCallId: string): void {
    store.delete(toolCallId);
    listeners.delete(toolCallId);
}
