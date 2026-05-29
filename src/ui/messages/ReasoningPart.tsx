import { Box } from 'ink';
import React from 'react';
import { Markdown } from '../text/Markdown';
import { ThemedText } from '../text/ThemedText';

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
                <ThemedText color="textDim" italic>
                    {'\u2234'} {label}
                    <ThemedText color="subtle"> (Ctrl+R)</ThemedText>
                </ThemedText>
            </Box>
        );
    }

    return (
        <Box marginBottom={1} paddingLeft={1} flexDirection="column">
            <ThemedText color="textDim" italic>
                {'\u2234'} Thinking{isStreaming ? '\u2026' : ''}
            </ThemedText>
            <Box paddingLeft={2}>
                <Markdown text={text} dimColor />
            </Box>
        </Box>
    );
});
