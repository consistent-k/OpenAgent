import { Box, Text } from 'ink';
import React from 'react';
import { Markdown } from '../text/Markdown';

interface ReasoningPartProps {
    text: string;
    state?: 'streaming' | 'done';
    showReasoning: boolean;
}

export const ReasoningPart = React.memo(function ReasoningPart({ text, state, showReasoning }: ReasoningPartProps) {
    const isStreaming = state === 'streaming';

    if (!showReasoning) {
        const label = isStreaming ? 'Thinking\u2026' : 'Completed thinking';
        return (
            <Box marginBottom={1} paddingLeft={1}>
                <Text dimColor italic>
                    {'\u2234'} {label}
                    <Text dimColor> (Ctrl+R)</Text>
                </Text>
            </Box>
        );
    }

    return (
        <Box marginBottom={1} paddingLeft={1} flexDirection="column">
            <Text dimColor italic>
                {'\u2234'} Thinking{isStreaming ? '\u2026' : ''}
            </Text>
            <Box paddingLeft={2}>
                <Markdown text={text} dimColor />
            </Box>
        </Box>
    );
});
