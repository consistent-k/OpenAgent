export type TokenKind = 'keyword' | 'string' | 'comment' | 'function' | 'number' | 'type' | 'operator' | 'punctuation' | 'plain';

export interface HighlightToken {
    text: string;
    kind: TokenKind;
}

const TOKEN_RE =
    /(?<comment>\/\/.*|\/\*[\s\S]*?\*\/)|(?<string>"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(?<number>\b\d+\.?\d*\b)|(?<keyword>\b(?:import|export|from|require|const|let|var|function|return|if|else|for|while|class|extends|new|this|async|await|try|catch|throw|switch|case|break|default|typeof|instanceof|void|delete|yield|of|in|def|elif|except|finally|with|as|pass|raise|lambda|print|True|False|None|true|false|null|undefined|nil)\b)|(?<type>\b[A-Z][a-zA-Z0-9]*\b)|(?<ident>([a-zA-Z_]\w*)\s*(?=\())|(?<punctuation>[{}()[\];,.])|(?<operator>[+\-*/%=<>!&|^~?:@#]+)/g;

export function highlightCode(code: string): HighlightToken[] {
    const tokens: HighlightToken[] = [];
    let last = 0;

    for (const m of code.matchAll(TOKEN_RE)) {
        if (m.index! > last) {
            tokens.push({ text: code.slice(last, m.index), kind: 'plain' });
        }

        const groups = m.groups!;
        const text = m[0];
        let kind: TokenKind = 'plain';

        if (groups.comment) kind = 'comment';
        else if (groups.string) kind = 'string';
        else if (groups.number) kind = 'number';
        else if (groups.keyword) kind = 'keyword';
        else if (groups.type) kind = 'type';
        else if (groups.ident) {
            const funcName = groups.ident.split(/\s*\(/)[0]!;
            if (funcName.length > 0 && funcName.length < text.length) {
                tokens.push({ text: funcName, kind: 'function' });
                tokens.push({ text: text.slice(funcName.length), kind: 'punctuation' });
            } else {
                kind = 'function';
            }
        } else if (groups.punctuation) kind = 'punctuation';
        else if (groups.operator) kind = 'operator';

        if (kind !== 'plain' || !groups.ident) {
            tokens.push({ text, kind });
        }

        last = m.index! + text.length;
    }

    if (last < code.length) {
        tokens.push({ text: code.slice(last), kind: 'plain' });
    }

    return tokens;
}
