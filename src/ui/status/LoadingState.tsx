import { Box, Text } from 'ink';
import React from 'react';
import { Spinner } from '../text/Spinner';

interface LoadingStateProps {
    message: string;
    bold?: boolean;
    dimColor?: boolean;
    subtitle?: string;
}

export function LoadingState({ message, bold = false, dimColor = false, subtitle }: LoadingStateProps) {
    return (
        <Box flexDirection="column">
            <Box flexDirection="row">
                <Spinner />
                <Text bold={bold} dimColor={dimColor}>
                    {' '}
                    {message}
                </Text>
            </Box>
            {subtitle && <Text dimColor>{subtitle}</Text>}
        </Box>
    );
}
