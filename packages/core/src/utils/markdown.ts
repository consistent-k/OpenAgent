import { marked } from 'marked';
import type { Token } from 'marked';

const MD_SYNTAX_RE = /[#*`|[>\-_~]|\n\n|^\d+\. |\n\d+\. /;

export function hasMarkdownSyntax(text: string): boolean {
    return MD_SYNTAX_RE.test(text.length > 500 ? text.slice(0, 500) : text);
}

export function lexMarkdown(text: string): Token[] {
    return marked.lexer(text) as Token[];
}
