import { Box, Text } from 'ink';
import React from 'react';
import { Markdown } from '../text/Markdown';

interface TextPartProps {
    text: string;
    state?: 'streaming' | 'done';
}

export const TextPart = React.memo(function TextPart({ text, state }: TextPartProps) {
    return (
        <Box marginBottom={1} paddingLeft={1}>
            <Box flexGrow={1}>
                <Markdown text={text} />
            </Box>
            {state === 'streaming' && <Text dimColor>{'\u258A'}</Text>}
        </Box>
    );
});
