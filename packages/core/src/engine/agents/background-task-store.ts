/**
 * Background task store for sub-agents running in the background.
 *
 * When a sub-agent is launched with run_in_background=true, its task is
 * registered here. The UI can subscribe to observe running/completed tasks.
 * Tasks are auto-cleaned after TTL to prevent memory leaks.
 */

export interface BackgroundTask {
    id: string;
    agentId: string;
    description: string;
    status: 'running' | 'completed' | 'failed';
    result?: string;
    error?: string;
    startedAt: number;
    completedAt?: number;
}

type Listener = (tasks: BackgroundTask[]) => void;

const tasks = new Map<string, BackgroundTask>();
const listeners = new Set<Listener>();

/** Task TTL: 30 minutes after completion */
const COMPLETED_TASK_TTL_MS = 30 * 60 * 1000;

/** Clean up expired completed tasks */
function sweepStaleTasks(): void {
    const now = Date.now();
    for (const [id, task] of tasks) {
        if (task.status !== 'running' && task.completedAt && now - task.completedAt > COMPLETED_TASK_TTL_MS) {
            tasks.delete(id);
        }
    }
}

function notifyListeners(): void {
    const all = getAllBackgroundTasks();
    for (const listener of listeners) {
        listener(all);
    }
}

export function registerBackgroundTask(task: BackgroundTask): void {
    tasks.set(task.id, task);
    notifyListeners();
}

export function updateBackgroundTask(id: string, updates: Partial<BackgroundTask>): void {
    const existing = tasks.get(id);
    if (!existing) return;
    tasks.set(id, { ...existing, ...updates });
    sweepStaleTasks();
    notifyListeners();
}

export function getBackgroundTask(id: string): BackgroundTask | undefined {
    return tasks.get(id);
}

export function getAllBackgroundTasks(): BackgroundTask[] {
    return Array.from(tasks.values());
}

export function getRunningBackgroundTasks(): BackgroundTask[] {
    return getAllBackgroundTasks().filter((t) => t.status === 'running');
}

/** Subscribe to task changes. Returns unsubscribe function. */
export function subscribeBackgroundTasks(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
