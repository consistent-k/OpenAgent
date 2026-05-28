import { Text } from 'ink';
import React from 'react';
import { useTheme, type StringThemeKeys } from './theme';

interface DividerProps {
    color?: StringThemeKeys;
    char?: string;
    padding?: number;
    title?: string;
}

export function Divider({ color, char = '─', padding = 0, title }: DividerProps) {
    const { theme } = useTheme();
    const terminalWidth = process.stdout.columns ?? 80;
    const effectiveWidth = Math.max(0, terminalWidth - padding);

    if (title) {
        const titleWidth = title.length + 2;
        const sideWidth = Math.max(0, effectiveWidth - titleWidth);
        const leftWidth = Math.floor(sideWidth / 2);
        const rightWidth = sideWidth - leftWidth;
        return (
            <Text color={color ? theme[color] : undefined} dimColor={!color}>
                {char.repeat(leftWidth)} {title} {char.repeat(rightWidth)}
            </Text>
        );
    }

    return (
        <Text color={color ? theme[color] : undefined} dimColor={!color}>
            {char.repeat(effectiveWidth)}
        </Text>
    );
}
