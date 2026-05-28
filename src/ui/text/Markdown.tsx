import { Box, Text } from 'ink';
import type { Token, Tokens } from 'marked';
import React, { useMemo } from 'react';
import { highlightCode, type HighlightToken } from '../../utils/highlight';
import { hasMarkdownSyntax, lexMarkdown } from '../../utils/markdown';
import { MarkdownTable } from './MarkdownTable';
import { useTheme, type SyntaxColors } from './theme';

interface MarkdownProps {
    text: string;
    dimColor?: boolean;
}

function renderInline(tokens: Token[]): React.ReactNode[] {
    return tokens.map((tok, i) => {
        switch (tok.type) {
            case 'text':
                if (tok.tokens) {
                    return <React.Fragment key={i}>{renderInline(tok.tokens)}</React.Fragment>;
                }
                return <Text key={i}>{tok.text}</Text>;
            case 'strong':
                return (
                    <Text key={i} bold>
                        {tok.tokens ? renderInline(tok.tokens) : tok.text}
                    </Text>
                );
            case 'em':
                return (
                    <Text key={i} italic>
                        {tok.tokens ? renderInline(tok.tokens) : tok.text}
                    </Text>
                );
            case 'codespan':
                return (
                    <Text key={i} color="cyan">
                        {tok.text}
                    </Text>
                );
            case 'link':
                return (
                    <Text key={i} underline color="cyan">
                        {tok.tokens ? renderInline(tok.tokens) : tok.text}
                    </Text>
                );
            case 'br':
                return <Text key={i}>{'\n'}</Text>;
            case 'del':
                return (
                    <Text key={i} strikethrough>
                        {tok.tokens ? renderInline(tok.tokens) : tok.text}
                    </Text>
                );
            case 'escape':
                return <Text key={i}>{tok.text}</Text>;
            case 'image':
                return (
                    <Text key={i} color="cyan" dimColor>
                        [img: {tok.text || tok.href}]
                    </Text>
                );
            case 'html':
                return (
                    <Text key={i} dimColor>
                        {tok.text}
                    </Text>
                );
            default:
                return null;
        }
    });
}

function HighlightedLine({ tokens, syntax }: { tokens: HighlightToken[]; syntax: SyntaxColors }) {
    return (
        <Text>
            {tokens.map((tok, i) => {
                if (tok.kind === 'plain') return <Text key={i}>{tok.text}</Text>;
                const color = syntax[tok.kind as keyof SyntaxColors] ?? undefined;
                const isComment = tok.kind === 'comment';
                return (
                    <Text key={i} color={color} italic={isComment}>
                        {tok.text}
                    </Text>
                );
            })}
        </Text>
    );
}

function CodeBlock({ token, dimColor }: { token: Tokens.Code; dimColor?: boolean }) {
    const { theme } = useTheme();
    const lines = useMemo(() => {
        return token.text.split('\n').map((line) => highlightCode(line));
    }, [token.text]);

    return (
        <Box flexDirection="column" borderStyle="round" borderColor={dimColor ? theme.textDim : theme.border} paddingX={1}>
            {token.lang ? (
                <Text dimColor italic>
                    {token.lang}
                </Text>
            ) : null}
            {lines.map((lineTokens, i) => (
                <HighlightedLine key={i} tokens={lineTokens} syntax={theme.syntax} />
            ))}
        </Box>
    );
}

function ParagraphBlock({ tokens, dimColor }: { tokens: Token[]; dimColor?: boolean }) {
    if (tokens.length === 0) return null;
    return (
        <Text wrap="wrap" dimColor={dimColor}>
            {renderInline(tokens)}
        </Text>
    );
}

function ListBlock({ token, dimColor, depth = 0 }: { token: Tokens.List; dimColor?: boolean; depth?: number }) {
    const indent = '  '.repeat(depth);
    return (
        <Box flexDirection="column">
            {token.items.map((item, i) => {
                const bullet = token.ordered ? `${typeof token.start === 'number' ? token.start + i : i + 1}.` : '\u2022';
                // item.tokens contains parsed child tokens (paragraph, text with inline tokens, etc.)
                // When present, render them properly. Fall back to item.text for simple cases.
                const inlineTokens =
                    item.tokens?.flatMap((child) => {
                        // Unwrap single-level paragraph/text wrappers to get inline tokens
                        if (child.type === 'paragraph' && child.tokens) return child.tokens;
                        if (child.type === 'text' && child.tokens) return child.tokens;
                        return [child];
                    }) ?? [];
                return (
                    <Box key={i} flexDirection="row">
                        <Text dimColor={dimColor}>
                            {indent}
                            {bullet}{' '}
                        </Text>
                        <Box flexGrow={1}>
                            {inlineTokens.length > 0 ? (
                                <Text wrap="wrap" dimColor={dimColor}>
                                    {renderInline(inlineTokens)}
                                </Text>
                            ) : (
                                <Text dimColor={dimColor}>{item.text}</Text>
                            )}
                        </Box>
                    </Box>
                );
            })}
        </Box>
    );
}

function HtmlBlock({ token, dimColor }: { token: Tokens.HTML; dimColor?: boolean }) {
    return <Text dimColor={dimColor}>{token.text}</Text>;
}

export function Markdown({ text, dimColor }: MarkdownProps) {
    if (!hasMarkdownSyntax(text)) {
        return (
            <Text wrap="wrap" dimColor={dimColor}>
                {text}
            </Text>
        );
    }

    const tokens = useMemo(() => lexMarkdown(text), [text]);

    return (
        <Box flexDirection="column" gap={1}>
            {tokens.map((tok, i) => {
                switch (tok.type) {
                    case 'paragraph':
                        return <ParagraphBlock key={i} tokens={(tok as Tokens.Paragraph).tokens} dimColor={dimColor} />;
                    case 'heading': {
                        const heading = tok as Tokens.Heading;
                        return (
                            <Text key={i} bold={heading.depth <= 3} underline={heading.depth === 1} dimColor={dimColor}>
                                {heading.tokens ? renderInline(heading.tokens) : heading.text}
                            </Text>
                        );
                    }
                    case 'code':
                        return <CodeBlock key={i} token={tok as Tokens.Code} dimColor={dimColor} />;
                    case 'list':
                        return <ListBlock key={i} token={tok as Tokens.List} dimColor={dimColor} />;
                    case 'blockquote':
                        return (
                            <Box key={i} flexDirection="row">
                                <Text dimColor>{'\u258E'} </Text>
                                <Box flexGrow={1}>
                                    {(tok as Tokens.Blockquote).tokens.length > 0 ? (
                                        <ParagraphBlock tokens={(tok as Tokens.Blockquote).tokens} dimColor={dimColor} />
                                    ) : (
                                        <Text dimColor={dimColor}>{(tok as Tokens.Blockquote).text}</Text>
                                    )}
                                </Box>
                            </Box>
                        );
                    case 'hr':
                        return (
                            <Text key={i} dimColor>
                                {'\u2500\u2500\u2500'}
                            </Text>
                        );
                    case 'space':
                        return null;
                    case 'table':
                        return <MarkdownTable key={i} token={tok as Tokens.Table} />;
                    case 'html':
                        return <HtmlBlock key={i} token={tok as Tokens.HTML} dimColor={dimColor} />;
                    default:
                        return null;
                }
            })}
        </Box>
    );
}
