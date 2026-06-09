import { t } from '@oagent/i18n';
import { Box, Text } from 'ink';
import React from 'react';
import type { SlashCommand } from '../../commands';
import { useTheme } from '../text/theme';

interface CommandPaletteProps {
    commands: SlashCommand[];
    selectedIndex: number;
}

export function CommandPalette({ commands, selectedIndex }: CommandPaletteProps) {
    const { theme } = useTheme();

    if (commands.length === 0) {
        return (
            <Box paddingX={1}>
                <Text color={theme.inactive}>{t('ui.commandPalette.noMatch')}</Text>
            </Box>
        );
    }

    return (
        <>
            {commands.map((cmd, i) => (
                <Box key={cmd.name} paddingX={1}>
                    <Box width={2}>
                        <Text color={i === selectedIndex ? theme.suggestion : undefined}>{i === selectedIndex ? '❯' : ' '}</Text>
                    </Box>
                    <Box width={25}>
                        <Text>{cmd.name}</Text>
                    </Box>
                    <Box>
                        <Text dimColor>{cmd.getDescription()}</Text>
                    </Box>
                </Box>
            ))}
        </>
    );
}
