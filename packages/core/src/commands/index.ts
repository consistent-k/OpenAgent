import { approvalsCommand } from './approvals';
import { cancelCommand } from './cancel';
import { channelCommand } from './channel';
import { clearCommand } from './clear';
import { configCommand } from './config';
import { exitCommand } from './exit';
import { helpCommand } from './help';
import { localeCommand } from './locale';
import type { SlashCommand } from './registry';
import { reloadCommand } from './reload';
import { sessionsCommand } from './sessions';
import { statusCommand } from './status';
import { themeCommand } from './theme';
import { toolsCommand } from './tools';
import { updateCommand } from './update';

export const COMMANDS: SlashCommand[] = [
    helpCommand,
    statusCommand,
    configCommand,
    approvalsCommand,
    themeCommand,
    toolsCommand,
    channelCommand,
    localeCommand,
    reloadCommand,
    cancelCommand,
    sessionsCommand,
    clearCommand,
    updateCommand,
    exitCommand
];

export function parseCommandInput(input: string): { name: string; args: string[] } {
    const [name = '', ...args] = input.trim().split(/\s+/).filter(Boolean);
    return { name, args };
}

export function findCommand(name: string): SlashCommand | undefined {
    return COMMANDS.find((c) => c.name === name);
}

export type { SlashCommand } from './registry';
