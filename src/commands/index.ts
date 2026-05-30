import { approvalsCommand } from './approvals';
import { cancelCommand } from './cancel';
import { clearCommand } from './clear';
import { configCommand } from './config';
import { exitCommand } from './exit';
import { helpCommand } from './help';
import { loadCommand } from './load';
import type { SlashCommand } from './registry';
import { reloadCommand } from './reload';
import { sessionsCommand } from './sessions';
import { statusCommand } from './status';
import { themeCommand } from './theme';
import { toolsCommand } from './tools';

export const COMMANDS: SlashCommand[] = [
    helpCommand,
    statusCommand,
    configCommand,
    approvalsCommand,
    themeCommand,
    toolsCommand,
    reloadCommand,
    cancelCommand,
    loadCommand,
    sessionsCommand,
    clearCommand,
    exitCommand
];

export function parseCommandInput(input: string): { name: string; args: string[] } {
    const [name = '', ...args] = input.trim().split(/\s+/).filter(Boolean);
    return { name, args };
}

export function findCommand(name: string): SlashCommand | undefined {
    return COMMANDS.find((c) => c.name === name);
}

export type { SlashCommand, CommandContext } from './registry';
