import { t } from '@oagent/i18n';
import React from 'react';
import type { SlashCommand } from '../../commands';
import { ListItem } from '../text/ListItem';
import { ThemedBox } from '../text/ThemedBox';

interface CommandPaletteProps {
    commands: SlashCommand[];
    selectedIndex: number;
}

export function CommandPalette({ commands, selectedIndex }: CommandPaletteProps) {
    if (commands.length === 0) {
        return (
            <ThemedBox borderColor="border" paddingX={1}>
                <ListItem isFocused={false} disabled>
                    {t('ui.commandPalette.noMatch')}
                </ListItem>
            </ThemedBox>
        );
    }

    return (
        <ThemedBox borderColor="border" flexDirection="column" paddingX={1}>
            {commands.map((cmd, i) => (
                <ListItem key={cmd.name} isFocused={i === selectedIndex}>
                    {cmd.name} — {cmd.getDescription()}
                </ListItem>
            ))}
        </ThemedBox>
    );
}
