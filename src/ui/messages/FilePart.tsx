import { Box } from 'ink';
import React from 'react';
import { ThemedText } from '../text/ThemedText';

interface FilePartProps {
    mediaType: string;
    url: string;
}

export const FilePart = React.memo(function FilePart({ mediaType, url }: FilePartProps) {
    return (
        <Box marginBottom={1} paddingLeft={1}>
            <ThemedText color="accent">■</ThemedText>
            <ThemedText color="textDim"> {mediaType}</ThemedText>
            <ThemedText color="textDim"> {url}</ThemedText>
        </Box>
    );
});
