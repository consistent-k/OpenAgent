import { Box } from 'ink';
import React from 'react';
import { ThemedText } from '../text/ThemedText';

interface UserMessageProps {
    id: string;
    text: string;
}

export const UserMessage = React.memo(function UserMessage({ id: _id, text }: UserMessageProps) {
    return (
        <Box marginBottom={1} paddingLeft={1}>
            <ThemedText bold>
                <ThemedText color="accent">❯</ThemedText>
                <ThemedText> {text}</ThemedText>
            </ThemedText>
        </Box>
    );
});
