import { Box } from 'ink';
import React from 'react';
import { Divider } from './Divider';
import type { StringThemeKeys } from './theme';

interface PaneProps {
    children: React.ReactNode;
    color?: StringThemeKeys;
}

export function Pane({ children, color }: PaneProps) {
    return (
        <Box flexDirection="column" paddingTop={1}>
            <Divider color={color} />
            <Box flexDirection="column" paddingX={2}>
                {children}
            </Box>
        </Box>
    );
}
