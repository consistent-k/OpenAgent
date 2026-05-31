import type { TextProps } from 'ink';
import { Text } from 'ink';
import React from 'react';
import { resolveColor, useTheme, type StringThemeKeys } from './theme';

type Props = TextProps & {
    color?: StringThemeKeys | string;
    backgroundColor?: StringThemeKeys | string;
};

export function ThemedText({ color, backgroundColor, dimColor, bold, italic, underline, strikethrough, inverse, wrap, children }: Props) {
    const { theme } = useTheme();
    const resolvedColor = resolveColor(color, theme);
    const resolvedBg = backgroundColor ? resolveColor(backgroundColor, theme) : undefined;
    return (
        <Text color={resolvedColor} backgroundColor={resolvedBg} dimColor={dimColor} bold={bold} italic={italic} underline={underline} strikethrough={strikethrough} inverse={inverse} wrap={wrap}>
            {children}
        </Text>
    );
}
