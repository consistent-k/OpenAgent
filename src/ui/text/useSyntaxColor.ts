import { useTheme, type SyntaxColors } from './theme';

export function useSyntaxColor(kind: keyof SyntaxColors): string {
    const { theme } = useTheme();
    return theme.syntax[kind];
}
