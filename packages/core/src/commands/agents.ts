import { agentRegistry } from '@oagent/agents';
import { t } from '@oagent/i18n';
import { ensureAgentsLoaded } from '../engine';
import { uid } from '../utils/uid';
import type { SlashCommand } from './registry';

export const agentsCommand: SlashCommand = {
    name: '/agents',
    getDescription: () => t('command.agents.description'),
    run: async ({ rawInput, appendMessages }) => {
        await ensureAgentsLoaded();
        const agents = agentRegistry.getAll();

        if (agents.length === 0) {
            appendMessages([
                { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
                {
                    id: uid(),
                    role: 'assistant',
                    parts: [{ type: 'text', text: t('command.agents.none'), state: 'done' }]
                }
            ]);
            return;
        }

        const list = agents
            .map((a) => {
                const tools = a.allowedTools ? a.allowedTools.join(', ') : 'all';
                const source = `[${a.source}]`;
                const model = a.model ? ` | Model: ${a.model}` : '';
                return `- **${a.name}** (${a.id}) ${source}\n  ${a.description}\n  Tools: ${tools}${model}`;
            })
            .join('\n\n');

        appendMessages([
            { id: uid(), role: 'user', parts: [{ type: 'text', text: rawInput }] },
            {
                id: uid(),
                role: 'assistant',
                parts: [{ type: 'text', text: `## ${t('command.agents.title')}\n\n${list}`, state: 'done' }]
            }
        ]);
    }
};
