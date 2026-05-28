import { Text } from 'ink';
import React from 'react';
import { useTheme, type StringThemeKeys } from '../text/theme';

type Status = 'success' | 'error' | 'warning' | 'info' | 'pending' | 'loading';

interface StatusIconProps {
    status: Status;
    withSpace?: boolean;
}

const STATUS_CONFIG: Record<Status, { icon: string; color?: StringThemeKeys }> = {
    success: { icon: '✓', color: 'success' },
    error: { icon: '✗', color: 'error' },
    warning: { icon: '⚠', color: 'warning' },
    info: { icon: 'ℹ', color: 'suggestion' },
    pending: { icon: '○', color: undefined },
    loading: { icon: '…', color: undefined }
};

export function StatusIcon({ status, withSpace }: StatusIconProps) {
    const { theme } = useTheme();
    const config = STATUS_CONFIG[status];
    const resolvedColor = config.color ? theme[config.color] : undefined;

    return (
        <Text color={resolvedColor} dimColor={!config.color}>
            {config.icon}
            {withSpace ? ' ' : ''}
        </Text>
    );
}
