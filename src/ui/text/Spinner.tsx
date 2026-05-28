import { Text } from 'ink';
import React, { useEffect, useState } from 'react';

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

interface SpinnerProps {
    color?: string;
}

export function Spinner({ color }: SpinnerProps) {
    const [frame, setFrame] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setFrame((f) => (f + 1) % SPINNER_FRAMES.length);
        }, 80);
        return () => clearInterval(timer);
    }, []);

    return <Text color={color}>{SPINNER_FRAMES[frame]}</Text>;
}
