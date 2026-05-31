import type { DynamicToolUIPart, TextUIPart, UIMessage } from 'ai';
import { Box } from 'ink';
import React from 'react';
import { Divider } from '../text/Divider';
import { groupParts } from './groupToolParts';
import { ToolCallGroup } from './ToolCallGroup';
import { PartRenderer } from './';
import { UserMessage } from './';

interface MessageListProps {
    messages: UIMessage[];
    showReasoning: boolean;
    showToolDetails: boolean;
}

export const MessageList = React.memo(function MessageList({ messages, showReasoning, showToolDetails }: MessageListProps) {
    return (
        <Box flexDirection="column" paddingX={1}>
            {messages.map((msg, mi) => (
                <Box key={msg.id} flexDirection="column">
                    {mi > 0 && <Divider padding={1} />}
                    {msg.role === 'user' ? (
                        <UserMessage text={(msg.parts[0] as TextUIPart | undefined)?.text ?? ''} />
                    ) : (
                        <Box flexDirection="column" marginBottom={1}>
                            {groupParts(msg.parts).map((group) => {
                                if (group.type === 'tool-group') {
                                    const allTerminal = group.parts.every((p) => p.state === 'output-available' || p.state === 'output-error' || p.state === 'output-denied');
                                    return <ToolCallGroup key={`${msg.id}-tg-${group.startIndex}`} parts={group.parts as DynamicToolUIPart[]} expanded={!allTerminal || showToolDetails} />;
                                }
                                return <PartRenderer key={`${msg.id}-${group.startIndex}`} part={group.part} partIndex={group.startIndex} messageId={msg.id} showReasoning={showReasoning} />;
                            })}
                        </Box>
                    )}
                </Box>
            ))}
        </Box>
    );
});
