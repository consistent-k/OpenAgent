import type { BoxProps } from 'ink';
import { Box } from 'ink';
import React from 'react';
import { resolveColor, useTheme, type StringThemeKeys } from './theme';

type Props = BoxProps & {
    borderColor?: StringThemeKeys | string;
    backgroundColor?: StringThemeKeys | string;
    children?: React.ReactNode;
};

export function ThemedBox({ borderColor, backgroundColor, children, ...rest }: Props) {
    const { theme } = useTheme();
    const resolvedBorder = resolveColor(borderColor, theme);
    const resolvedBg = resolveColor(backgroundColor, theme);
    return (
        <Box borderColor={resolvedBorder} backgroundColor={resolvedBg} {...rest}>
            {children}
        </Box>
    );
}
