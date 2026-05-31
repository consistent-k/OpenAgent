import type { DynamicToolUIPart } from 'ai';
import { Box } from 'ink';
import React from 'react';
import { FilePart } from './FilePart';
import { ReasoningPart } from './ReasoningPart';
import { TextPart } from './TextPart';
import { ToolCallPart } from './ToolCallPart';

interface PartRendererProps {
    part: Record<string, unknown>;
    partIndex: number;
    messageId: string;
    showReasoning: boolean;
}

export function PartRenderer({ part, partIndex, messageId, showReasoning }: PartRendererProps) {
    const key = `${messageId}-${partIndex}`;
    const type = part.type as string;

    switch (type) {
        case 'text':
            return <TextPart key={key} text={(part as { text: string }).text} state={(part as { state?: 'streaming' | 'done' }).state} />;
        case 'reasoning':
            return <ReasoningPart key={key} text={(part as { text: string }).text} state={(part as { state?: 'streaming' | 'done' }).state} showReasoning={showReasoning} />;
        case 'dynamic-tool':
            return <ToolCallPart key={key} part={part as DynamicToolUIPart} />;
        case 'file':
        case 'source':
        case 'source-url':
            return <FilePart key={key} mediaType={(part as { mediaType?: string }).mediaType ?? type} url={(part as { url?: string }).url ?? ''} />;
        default:
            return <Box key={key} />;
    }
}
