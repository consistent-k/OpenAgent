/**
 * Channel 管理器
 * 负责 channel 的注册、启动、停止和状态管理
 */
import type { Channel, ChannelMessageEvent } from './types.js';

export interface ChannelState {
    channel: Channel;
    abortController: AbortController | null;
    startedAt: number | null;
}

export class ChannelManager {
    private channels = new Map<string, ChannelState>();

    /** 注册一个 channel */
    register(channel: Channel): void {
        if (this.channels.has(channel.id)) {
            throw new Error(`Channel "${channel.id}" 已注册`);
        }
        this.channels.set(channel.id, {
            channel,
            abortController: null,
            startedAt: null
        });
    }

    /** 获取指定 channel */
    get(id: string): Channel | undefined {
        return this.channels.get(id)?.channel;
    }

    /** 获取所有已注册的 channel */
    list(): Channel[] {
        return Array.from(this.channels.values()).map((s) => s.channel);
    }

    /** 启动指定 channel */
    async start(id: string, onMessage: (event: ChannelMessageEvent) => void): Promise<void> {
        const state = this.channels.get(id);
        if (!state) throw new Error(`Channel "${id}" 未注册`);
        if (state.abortController) throw new Error(`Channel "${id}" 已在运行`);

        const abortController = new AbortController();
        state.abortController = abortController;
        state.startedAt = Date.now();

        try {
            await state.channel.start({
                abortSignal: abortController.signal,
                onMessage
            });
        } finally {
            state.abortController = null;
            state.startedAt = null;
        }
    }

    /** 停止指定 channel */
    async stop(id: string): Promise<void> {
        const state = this.channels.get(id);
        if (!state) throw new Error(`Channel "${id}" 未注册`);
        if (!state.abortController) return;

        state.abortController.abort();
        await state.channel.stop();
        state.abortController = null;
        state.startedAt = null;
    }

    /** 停止所有 channel */
    async stopAll(): Promise<void> {
        const results = await Promise.allSettled(Array.from(this.channels.keys()).map((id) => this.stop(id)));
        for (const r of results) {
            if (r.status === 'rejected') {
                console.error(`停止 channel 失败: ${r.reason}`);
            }
        }
    }

    /** 检查 channel 是否在运行 */
    isRunning(id: string): boolean {
        return this.channels.get(id)?.abortController != null;
    }

    /** 获取 channel 运行时长（毫秒） */
    getUptime(id: string): number {
        const startedAt = this.channels.get(id)?.startedAt;
        return startedAt ? Date.now() - startedAt : 0;
    }
}

/** 全局单例 */
export const channelManager = new ChannelManager();
