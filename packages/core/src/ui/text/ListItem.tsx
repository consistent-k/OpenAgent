import { Box, Text } from 'ink';
import React from 'react';
import { useTheme } from './theme';

interface ListItemProps {
    isFocused: boolean;
    isSelected?: boolean;
    children: React.ReactNode;
    description?: string;
    disabled?: boolean;
}

export function ListItem({ isFocused, isSelected = false, children, description, disabled = false }: ListItemProps) {
    const { theme } = useTheme();

    const indicator = () => {
        if (disabled) return <Text> </Text>;
        if (isFocused) return <Text color={theme.suggestion}>{'❯'}</Text>;
        return <Text> </Text>;
    };

    const textColor = () => {
        if (disabled) return theme.inactive;
        if (isSelected) return theme.success;
        if (isFocused) return theme.suggestion;
        return undefined;
    };

    return (
        <Box flexDirection="column">
            <Box flexDirection="row" gap={1}>
                {indicator()}
                <Box flexGrow={1}>
                    <Text color={textColor()}>{children}</Text>
                </Box>
                {isSelected && !disabled && <Text color={theme.success}>✓</Text>}
            </Box>
            {description && (
                <Box paddingLeft={2}>
                    <Text color={theme.textDim}>{description}</Text>
                </Box>
            )}
        </Box>
    );
}
