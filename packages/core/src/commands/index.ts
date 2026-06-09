import { agentRegistry, type AgentEventEmitter } from '@oagent/agents';
import { t } from '@oagent/i18n';
import { getAgentEventEmitter, onAgentReload } from '../engine';
import { truncate } from '../utils/truncate';
import { uid } from '../utils/uid';
import { agentsCommand } from './agents';
import { approvalsCommand } from './approvals';
import { channelCommand } from './channel';
import { clearCommand } from './clear';
import { configCommand } from './config';
import { exitCommand } from './exit';
import { localeCommand } from './locale';
import type { SlashCommand } from './registry';
import { reloadCommand } from './reload';
import { sessionsCommand } from './sessions';
import { statusCommand } from './status';
import { themeCommand } from './theme';
import { toolsCommand } from './tools';
import { updateCommand } from './update';

export const COMMANDS: SlashCommand[] = [
    statusCommand,
    configCommand,
    approvalsCommand,
    agentsCommand,
    themeCommand,
    toolsCommand,
    channelCommand,
    localeCommand,
    reloadCommand,
    sessionsCommand,
    clearCommand,
    updateCommand,
    exitCommand
];

/** 缓存的 agent 命令列表（随 reload 失效） */
let cachedAgentCommands: SlashCommand[] | null = null;

/** 失效 agent 命令缓存 */
export function invalidateAgentCommandCache(): void {
    cachedAgentCommands = null;
}

// 注册 reload 回调，确保命令缓存随 agent 重载一起失效
onAgentReload(invalidateAgentCommandCache);

/** 从 agentRegistry 动态生成子代理命令（/<agent-id> 直接调用） */
export function getAgentCommands(): SlashCommand[] {
    if (cachedAgentCommands) return cachedAgentCommands;
    const commands = agentRegistry.getAll().map(
        (agent) =>
            ({
                name: `/${agent.id}`,
                getDescription: () => `(sub_agent)${agent.description}`,
                run: async (ctx) => {
                    const task = ctx.args.join(' ').trim();
                    if (!task) {
                        ctx.appendMessages([
                            { id: uid(), role: 'user', parts: [{ type: 'text', text: ctx.rawInput }] },
                            {
                                id: uid(),
                                role: 'assistant',
                                parts: [{ type: 'text', text: t('command.agent.noTask', { id: agent.id }), state: 'done' }]
                            }
                        ]);
                        return;
                    }

                    ctx.setSubAgentRunning?.(agent.name);
                    ctx.appendMessages([{ id: uid(), role: 'user', parts: [{ type: 'text', text: ctx.rawInput }] }]);

                    // 创建流式消息，文本增量通过 streamText 更新
                    const streamMsgId = uid();
                    ctx.startStreaming?.(streamMsgId);

                    // 通过 scoped emitter 实现流式输出（不再 swap 全局 emitter）
                    const prevEmitter = getAgentEventEmitter();
                    const streamEmitter: AgentEventEmitter = {
                        onAgentStart: (...a) => prevEmitter?.onAgentStart?.(...a),
                        onAgentText: (_agentId, _runId, textDelta) => {
                            ctx.streamText?.(textDelta);
                            prevEmitter?.onAgentText?.(_agentId, _runId, textDelta);
                        },
                        onAgentToolCall: (_agentId, _runId, toolName, input) => {
                            const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
                            ctx.streamText?.(`\n[${agent.name}] → ${toolName}(${truncate(inputStr, 120)})\n`);
                            prevEmitter?.onAgentToolCall?.(_agentId, _runId, toolName, input);
                        },
                        onAgentToolResult: (_agentId, _runId, toolName, result) => {
                            const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
                            ctx.streamText?.(`[${agent.name}]   ← ${truncate(resultStr, 200)}\n`);
                            prevEmitter?.onAgentToolResult?.(_agentId, _runId, toolName, result);
                        },
                        onAgentEnd: (...a) => prevEmitter?.onAgentEnd?.(...a),
                        onAgentError: (...a) => prevEmitter?.onAgentError?.(...a)
                    };

                    try {
                        const result = await ctx.executeAgent(agent.id, task, streamEmitter);
                        // 结束流式消息（替换为最终结果）
                        ctx.endStreaming?.(streamMsgId, result);
                    } catch (error) {
                        const errorMsg = error instanceof Error ? error.message : String(error);
                        ctx.endStreaming?.(streamMsgId, t('command.agent.error', { error: errorMsg }));
                    } finally {
                        ctx.setSubAgentRunning?.(null);
                    }
                }
            }) satisfies SlashCommand
    );
    cachedAgentCommands = commands;
    return commands;
}

/** 合并静态命令 + 动态 agent 命令（静态优先，用于 CommandPalette 自动补全） */
export function getAllCommands(): SlashCommand[] {
    return [...COMMANDS, ...getAgentCommands()];
}

export function parseCommandInput(input: string): { name: string; args: string[] } {
    const [name = '', ...args] = input.trim().split(/\s+/).filter(Boolean);
    return { name, args };
}

export function findCommand(name: string): SlashCommand | undefined {
    // 静态命令优先
    const staticCmd = COMMANDS.find((c) => c.name === name);
    if (staticCmd) return staticCmd;

    // fallback: 动态 agent 命令（agents 已在启动时加载完毕）
    const agentCmds = getAgentCommands();
    return agentCmds.find((c) => c.name === name);
}

export type { SlashCommand } from './registry';
