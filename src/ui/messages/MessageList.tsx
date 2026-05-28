import type { TextUIPart, UIMessage } from 'ai';
import { Box } from 'ink';
import React from 'react';
import { Divider } from '../text/Divider';
import { PartRenderer } from './';
import { UserMessage } from './';

interface MessageListProps {
    messages: UIMessage[];
    showReasoning: boolean;
}

export const MessageList = React.memo(function MessageList({ messages, showReasoning }: MessageListProps) {
    return (
        <Box flexDirection="column" paddingX={1}>
            {messages.map((msg, mi) => (
                <Box key={msg.id} flexDirection="column">
                    {mi > 0 && <Divider padding={1} />}
                    {msg.role === 'user' ? (
                        <UserMessage id={msg.id} text={(msg.parts[0] as TextUIPart | undefined)?.text ?? ''} />
                    ) : (
                        <Box flexDirection="column" marginBottom={1}>
                            {msg.parts.map((part, pi) => (
                                <PartRenderer key={`${msg.id}-${pi}`} part={part} partIndex={pi} messageId={msg.id} showReasoning={showReasoning} />
                            ))}
                        </Box>
                    )}
                </Box>
            ))}
        </Box>
    );
});
