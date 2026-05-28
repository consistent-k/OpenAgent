import { useTheme } from './theme';

export function useInverseColor(): { bg: string; fg: string } {
    const { theme } = useTheme();
    return { bg: theme.accent, fg: theme.text };
}
