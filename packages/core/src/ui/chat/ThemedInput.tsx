import TextInput from 'ink-text-input';
import React, { useCallback } from 'react';
import { ThemedBox } from '../text/ThemedBox';
import { ThemedText } from '../text/ThemedText';

interface ThemedInputProps {
    value: string;
    onChange: (v: string) => void;
    onSubmit: (v: string) => void;
    swallowRef: React.MutableRefObject<string | null>;
}

/**
 * 带 `> ` 前缀的主题输入框，含 swallowRef 处理。
 */
export function ThemedInput({ value, onChange, onSubmit, swallowRef }: ThemedInputProps) {
    const handleChange = useCallback(
        (v: string) => {
            const c = swallowRef.current;
            if (c && v === value + c) {
                swallowRef.current = null;
                return;
            }
            swallowRef.current = null;
            onChange(v);
        },
        [onChange, value, swallowRef]
    );

    return (
        <ThemedBox borderColor="border" paddingX={1}>
            <ThemedText color="accent">{'> '}</ThemedText>
            <TextInput value={value} onChange={handleChange} onSubmit={onSubmit} />
        </ThemedBox>
    );
}
