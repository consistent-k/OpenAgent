import { useEffect, useState } from 'react';
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
