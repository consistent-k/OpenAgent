/**
 * 子代理实时活动 store
 *
 * 在 executeAgentRun 的流循环中写入，UI 层通过 useAgentActivity hook 订阅。
 * 以 toolCallId 为 key，支持并行子代理的复合 key。
 * 带 TTL 自动清理，防止长时间运行会话的内存泄漏。
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

interface StoreEntry {
    activity: AgentActivity;
    lastUpdated: number;
}

type Listener = (activity: AgentActivity) => void;

const store = new Map<string, StoreEntry>();
const listeners = new Map<string, Set<Listener>>();

/** 条目 TTL：5 分钟未更新则视为过期 */
const ENTRY_TTL_MS = 5 * 60 * 1000;

/** 每 N 次 update 才触发一次 sweep（避免高频 text-delta 下的无效遍历） */
const SWEEP_INTERVAL = 50;
let updateCount = 0;

/** 清理过期条目（惰性触发，每 SWEEP_INTERVAL 次 update 检查一次） */
function sweepStaleEntries(): void {
    const now = Date.now();
    for (const [key, entry] of store) {
        if (now - entry.lastUpdated > ENTRY_TTL_MS) {
            store.delete(key);
            listeners.delete(key);
        }
    }
}

/** 读取当前活动数据 */
export function getAgentActivity(toolCallId: string): AgentActivity | undefined {
    return store.get(toolCallId)?.activity;
}

/** 更新活动数据并通知订阅者 */
export function updateAgentActivity(toolCallId: string, updater: (prev: AgentActivity) => AgentActivity): void {
    const prev = store.get(toolCallId)?.activity ?? { text: '', steps: [] };
    const next = updater(prev);
    store.set(toolCallId, { activity: next, lastUpdated: Date.now() });
    listeners.get(toolCallId)?.forEach((cb) => cb(next));

    // 惰性清理过期条目（每 SWEEP_INTERVAL 次 update 才遍历一次 map）
    if (++updateCount % SWEEP_INTERVAL === 0) {
        sweepStaleEntries();
    }
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
