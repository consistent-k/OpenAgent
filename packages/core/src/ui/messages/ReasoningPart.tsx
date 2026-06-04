import { t } from '@oagent/i18n';
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
        const label = isStreaming ? t('ui.reasoning.thinking') : t('ui.reasoning.completedThinking');
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
                {'\u2234'} {t('ui.reasoning.thinkingLabel')}
                {isStreaming ? '\u2026' : ''}
            </ThemedText>
            <Box paddingLeft={2}>
                <Markdown text={text} dimColor />
            </Box>
        </Box>
    );
});
