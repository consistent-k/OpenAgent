import { Text } from 'ink';
import React, { useEffect, useState } from 'react';
import { resolveColor, useTheme, type StringThemeKeys } from './theme';

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

interface SpinnerProps {
    color?: StringThemeKeys | string;
}

export function Spinner({ color }: SpinnerProps) {
    const { theme } = useTheme();
    const [frame, setFrame] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setFrame((f) => (f + 1) % SPINNER_FRAMES.length);
        }, 80);
        return () => clearInterval(timer);
    }, []);

    const resolved = color ? resolveColor(color, theme) : theme.accent;
    return <Text color={resolved}>{SPINNER_FRAMES[frame]}</Text>;
}
