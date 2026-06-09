import { useEffect, useRef, useState } from 'react';
import { getAgentActivity, subscribeAgentActivity, type AgentActivity } from '../engine/agents/agent-activity-store';

/**
 * 订阅子代理实时活动数据。
 * 在 toolCallId 对应的子代理执行期间，每次事件更新都会触发重新渲染。
 */
export function useAgentActivity(toolCallId: string): AgentActivity | undefined {
    const [activity, setActivity] = useState<AgentActivity | undefined>(() => getAgentActivity(toolCallId));

    useEffect(() => {
        // 同步最新值（可能在 useState 初始化后、effect 执行前已更新）
        setActivity(getAgentActivity(toolCallId));
        return subscribeAgentActivity(toolCallId, setActivity);
    }, [toolCallId]);

    return activity;
}

/**
 * 检测子代理是否正在运行。
 *
 * 通过 agent-activity-store 判断：store 中有数据说明子代理正在执行。
 * 不依赖 part.state（因为 useChat 可能在同一微任务中处理 tool-call 和 tool-result，
 * 导致 part 跳过 input-available 直接到 output-available）。
 *
 * @param toolCallId 工具调用 ID
 * @param isTerminal part 是否已到终态（output-available/error/denied）
 */
export function useAgentRunning(toolCallId: string, isTerminal: boolean): boolean {
    const [running, setRunning] = useState(() => !isTerminal && getAgentActivity(toolCallId) !== undefined);

    const isTerminalRef = useRef(isTerminal);
    isTerminalRef.current = isTerminal;

    useEffect(() => {
        // 终态时直接标记为非运行
        if (isTerminal) {
            setRunning(false);
            return;
        }

        // 同步检查 store（订阅前可能已有数据）
        if (getAgentActivity(toolCallId) !== undefined) {
            setRunning(true);
        }

        return subscribeAgentActivity(toolCallId, () => {
            if (!isTerminalRef.current) {
                setRunning(true);
            }
        });
    }, [toolCallId, isTerminal]);

    return running;
}
