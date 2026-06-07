import type { DynamicToolUIPart, SourceDocumentUIPart, SourceUrlUIPart, ToolUIPart, UIMessage } from 'ai';
import { getToolName } from 'ai';
import { Box } from 'ink';
import React from 'react';
import { AgentCallPart, isAgentTool } from './AgentCallPart';
import { FilePart } from './FilePart';
import { ReasoningPart } from './ReasoningPart';
import { TextPart } from './TextPart';
import { ToolCallPart } from './ToolCallPart';

type Part = UIMessage['parts'][number];

interface PartRendererProps {
    part: Part;
    partIndex: number;
    messageId: string;
    showReasoning: boolean;
}

/** Render a tool part — dispatches to AgentCallPart or ToolCallPart based on tool name */
function renderToolPart(key: string, part: DynamicToolUIPart | ToolUIPart) {
    const toolName = getToolName(part);
    if (isAgentTool(toolName)) {
        return <AgentCallPart key={key} part={part} />;
    }
    return <ToolCallPart key={key} part={part} />;
}

export function PartRenderer({ part, partIndex, messageId, showReasoning }: PartRendererProps) {
    const key = `${messageId}-${partIndex}`;
    const { type } = part;

    switch (type) {
        case 'text': {
            return <TextPart key={key} text={part.text} state={part.state} />;
        }
        case 'reasoning': {
            return <ReasoningPart key={key} text={part.text} state={part.state} showReasoning={showReasoning} />;
        }
        case 'dynamic-tool': {
            return renderToolPart(key, part as DynamicToolUIPart);
        }
        case 'file': {
            return <FilePart key={key} mediaType={part.mediaType} url={part.url ?? ''} />;
        }
        case 'source-url': {
            const p = part as SourceUrlUIPart;
            return <FilePart key={key} mediaType={p.title ?? 'source'} url={p.url} />;
        }
        case 'source-document': {
            const p = part as SourceDocumentUIPart;
            return <FilePart key={key} mediaType={p.mediaType} url={p.filename ?? p.title} />;
        }
        default:
            // 静态工具 (type: 'tool-*') 和未知类型 fallback
            if (type.startsWith('tool-')) {
                return renderToolPart(key, part as ToolUIPart);
            }
            return <Box key={key} />;
    }
}
