import { Text } from 'ink';
import React from 'react';
import { useTheme, type StringThemeKeys } from '../text/theme';

type Status = 'success' | 'error' | 'warning' | 'info' | 'pending' | 'loading';

interface StatusIconProps {
    status: Status;
    withSpace?: boolean;
}

const STATUS_CONFIG: Record<Status, { icon: string; color: StringThemeKeys }> = {
    success: { icon: '✓', color: 'success' },
    error: { icon: '✗', color: 'error' },
    warning: { icon: '⚠', color: 'warning' },
    info: { icon: 'ℹ', color: 'suggestion' },
    pending: { icon: '○', color: 'textDim' },
    loading: { icon: '…', color: 'textDim' }
};

export function StatusIcon({ status, withSpace }: StatusIconProps) {
    const { theme } = useTheme();
    const config = STATUS_CONFIG[status];

    return (
        <Text color={theme[config.color]}>
            {config.icon}
            {withSpace ? ' ' : ''}
        </Text>
    );
}
