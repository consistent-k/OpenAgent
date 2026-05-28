import { Text, useStdout } from 'ink';
import type { Token, Tokens } from 'marked';
import React, { useMemo } from 'react';
import { useTheme } from './theme';

// ── ANSI helpers ──────────────────────────────────────────────────

const ANSI = {
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function hexToAnsi(hex: string, fallback: string): string {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hexToAnsi(fallback, '#808080');
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `\x1b[38;2;${r};${g};${b}m`;
}

const STRIP_RE = /\x1b\[[0-9;]*m/g;

function stripAnsi(s: string): string {
    return s.replace(STRIP_RE, '');
}

function stringWidth(s: string): number {
    return stripAnsi(s).length;
}

// ── Text utilities ────────────────────────────────────────────────

function wrapText(text: string, width: number): string[] {
    if (width <= 0) return [text];
    const trimmed = text.trimEnd();
    if (trimmed.length === 0) return [''];

    const words = trimmed.split(/(\s+)/);
    const lines: string[] = [];
    let line = '';

    for (const word of words) {
        if (word === '') continue;
        if (/^\s+$/.test(word)) {
            // whitespace: collapse to single space
            if (line.length > 0) line += ' ';
            continue;
        }
        if (line.length === 0) {
            line = word;
        } else if (line.length + 1 + word.length <= width) {
            line += ' ' + word;
        } else {
            if (line) lines.push(line);
            line = word;
        }
    }
    if (line) lines.push(line);
    return lines.length > 0 ? lines : [''];
}

function padAligned(text: string, textWidth: number, colWidth: number, align: string | null): string {
    const diff = colWidth - textWidth;
    if (diff <= 0) return text;
    if (align === 'right') return ' '.repeat(diff) + text;
    if (align === 'center') {
        const left = Math.floor(diff / 2);
        return ' '.repeat(left) + text + ' '.repeat(diff - left);
    }
    return text + ' '.repeat(diff);
}

// ── Inline token → ANSI string ────────────────────────────────────

function formatInline(tokens: Token[], themeColors: { accent: string; textDim: string }): string {
    return tokens
        .map((tok) => {
            switch (tok.type) {
                case 'text':
                    if (tok.tokens) return formatInline(tok.tokens, themeColors);
                    return tok.text;
                case 'strong':
                    return `${ANSI.bold}${tok.tokens ? formatInline(tok.tokens, themeColors) : tok.text}${ANSI.reset}`;
                case 'em':
                    return `${ANSI.bold}${tok.tokens ? formatInline(tok.tokens, themeColors) : tok.text}${ANSI.reset}`;
                case 'codespan':
                    return `${hexToAnsi(themeColors.accent, themeColors.accent)}${tok.text}${ANSI.reset}`;
                case 'link':
                    return `${hexToAnsi(themeColors.accent, themeColors.accent)}${tok.tokens ? formatInline(tok.tokens, themeColors) : tok.text}${ANSI.reset}`;
                case 'image':
                    return `${hexToAnsi(themeColors.textDim, themeColors.textDim)}[img: ${tok.text || tok.href}]${ANSI.reset}`;
                case 'del':
                    return tok.tokens ? formatInline(tok.tokens, themeColors) : tok.text;
                case 'br':
                    return '\n';
                case 'escape':
                    return tok.text;
                case 'html':
                    return `${hexToAnsi(themeColors.textDim, themeColors.textDim)}${tok.text}${ANSI.reset}`;
                default:
                    return '';
            }
        })
        .join('');
}

function formatCell(tokens: Token[] | undefined, themeColors: { accent: string; textDim: string }): string {
    return tokens?.map((t) => formatInline([t], themeColors)).join('') ?? '';
}

function getPlainText(tokens: Token[] | undefined): string {
    return stripAnsi(formatCell(tokens, { accent: '', textDim: '' }));
}

// ── Column width calculation ──────────────────────────────────────

const SAFETY_MARGIN = 4;
const MIN_COLUMN_WIDTH = 3;
const MAX_ROW_LINES = 4;

interface Props {
    token: Tokens.Table;
}

export function MarkdownTable({ token }: Props): React.ReactNode {
    const { stdout } = useStdout();
    const { theme } = useTheme();
    const terminalWidth = stdout?.columns ?? 80;
    const themeColors = useMemo(() => ({ accent: theme.accent, textDim: theme.textDim }), [theme.accent, theme.textDim]);

    const numCols = token.header.length;

    // Ideal widths (full content, no wrapping)
    const idealWidths = token.header.map((_, colIdx) => {
        let max = Math.max(getPlainText(token.header[colIdx]!.tokens).length, MIN_COLUMN_WIDTH);
        for (const row of token.rows) {
            max = Math.max(max, getPlainText(row[colIdx]?.tokens).length, MIN_COLUMN_WIDTH);
        }
        return max;
    });

    // Border overhead: │ content │ content │
    const borderOverhead = 1 + numCols * 3; // leading │ + (2 padding + 1 border) per col
    const availableWidth = Math.max(terminalWidth - borderOverhead - SAFETY_MARGIN, numCols * MIN_COLUMN_WIDTH);

    const totalIdeal = idealWidths.reduce((s, w) => s + w, 0);

    let columnWidths: number[];
    if (totalIdeal <= availableWidth) {
        columnWidths = idealWidths;
    } else {
        // Distribute proportionally
        columnWidths = idealWidths.map((w) => Math.max(Math.floor((w / totalIdeal) * availableWidth), MIN_COLUMN_WIDTH));
    }

    // ── Check if wrapping makes rows too tall → use vertical format ──

    function maxRowLines(): number {
        let max = 1;
        for (const head of token.header) {
            max = Math.max(max, wrapText(formatCell(head.tokens, themeColors), columnWidths[0]!).length);
        }
        for (const row of token.rows) {
            row.forEach((cell, ci) => {
                max = Math.max(max, wrapText(formatCell(cell.tokens, themeColors), columnWidths[ci]!).length);
            });
        }
        return max;
    }

    const useVertical = maxRowLines() > MAX_ROW_LINES;

    // ── Render row lines (handles multi-line cells) ──

    function renderRowLines(cells: Array<{ tokens?: Token[] }>, isHeader: boolean): string[] {
        const cellLines = cells.map((cell, ci) => {
            const formatted = formatCell(cell.tokens, themeColors);
            return wrapText(formatted, columnWidths[ci]!);
        });

        const rowHeight = Math.max(...cellLines.map((l) => l.length), 1);
        const offsets = cellLines.map((l) => Math.floor((rowHeight - l.length) / 2));

        const result: string[] = [];
        for (let lineIdx = 0; lineIdx < rowHeight; lineIdx++) {
            let line = '│'; // │
            cells.forEach((_, ci) => {
                const lines = cellLines[ci]!;
                const contentIdx = lineIdx - offsets[ci]!;
                const lineText = contentIdx >= 0 && contentIdx < lines.length ? lines[contentIdx]! : '';
                const width = columnWidths[ci]!;
                const plainWidth = stringWidth(lineText);
                const align = isHeader ? 'center' : (token.align?.[ci] ?? null);
                line += ' ' + padAligned(lineText, plainWidth, width, align) + ' │';
            });
            result.push(line);
        }
        return result;
    }

    // ── Border lines ──

    function renderBorder(type: 'top' | 'middle' | 'bottom'): string {
        const chars: Record<string, [string, string, string, string]> = {
            top: ['┌', '─', '┬', '┐'], // ┌─┬─┐
            middle: ['├', '─', '┼', '┤'], // ├─┼─┤
            bottom: ['└', '─', '┴', '┘'] // └─┴─┘
        };
        const [left, mid, cross, right] = chars[type]!;
        let line = left;
        columnWidths.forEach((w, i) => {
            line += mid.repeat(w + 2) + (i < columnWidths.length - 1 ? cross : right);
        });
        return line;
    }

    // ── Vertical (key-value) format fallback ──

    function renderVertical(): string {
        const lines: string[] = [];
        const headers = token.header.map((h) => getPlainText(h.tokens));
        const sepWidth = Math.min(terminalWidth - 1, 40);
        const wrapIndent = '  ';

        token.rows.forEach((row, ri) => {
            if (ri > 0) lines.push(hexToAnsi(themeColors.textDim, themeColors.textDim) + '─'.repeat(sepWidth) + ANSI.reset);
            row.forEach((cell, ci) => {
                const label = headers[ci] || `Column ${ci + 1}`;
                const value = formatCell(cell.tokens, themeColors).replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
                const firstLineWidth = Math.max(terminalWidth - label.length - 3, 10);
                const subLineWidth = terminalWidth - wrapIndent.length - 1;

                const firstPass = wrapText(value, firstLineWidth);
                const firstLine = firstPass[0] || '';
                let wrapped: string[];
                if (firstPass.length <= 1) {
                    wrapped = firstPass;
                } else {
                    const remaining = firstPass
                        .slice(1)
                        .map((l) => l.trim())
                        .join(' ');
                    wrapped = [firstLine, ...wrapText(remaining, subLineWidth)];
                }

                lines.push(`${ANSI.bold}${label}:${ANSI.reset} ${wrapped[0] || ''}`);
                for (let i = 1; i < wrapped.length; i++) {
                    if (wrapped[i]!.trim()) lines.push(wrapIndent + wrapped[i]);
                }
            });
        });
        return lines.join('\n');
    }

    // ── Choose format ──

    if (useVertical) {
        return <Text>{renderVertical()}</Text>;
    }

    // Build horizontal table
    const tableLines: string[] = [];
    tableLines.push(renderBorder('top'));
    tableLines.push(...renderRowLines(token.header, true));
    tableLines.push(renderBorder('middle'));
    token.rows.forEach((row, ri) => {
        tableLines.push(...renderRowLines(row, false));
        if (ri < token.rows.length - 1) tableLines.push(renderBorder('middle'));
    });
    tableLines.push(renderBorder('bottom'));

    // Safety check: if any line exceeds terminal width, fall back to vertical
    const maxLineWidth = Math.max(...tableLines.map((l) => stringWidth(l)));
    if (maxLineWidth > terminalWidth - SAFETY_MARGIN) {
        return <Text>{renderVertical()}</Text>;
    }

    return <Text>{tableLines.join('\n')}</Text>;
}
