import { useInput } from 'ink';
import React, { useState } from 'react';
import { Dialog } from '../text/Dialog';
import { ListItem } from '../text/ListItem';
import type { ThemeName } from '../text/theme';

interface ThemePickerProps {
    current: ThemeName;
    onSelect: (name: ThemeName) => void;
    onCancel: () => void;
}

const THEME_OPTIONS: { name: ThemeName; label: string }[] = [
    { name: 'dark', label: 'Dark — 深色主题' },
    { name: 'light', label: 'Light — 浅色主题' },
    { name: '5525', label: '5525 — 五月天配色' },
    { name: 'bubu', label: 'Bubu — 卜卜配色' }
];

export function ThemePicker({ current, onSelect, onCancel }: ThemePickerProps) {
    const [index, setIndex] = useState(() => THEME_OPTIONS.findIndex((t) => t.name === current));

    useInput(
        (_input, key) => {
            if (key.upArrow) {
                setIndex((i) => Math.max(0, i - 1));
            } else if (key.downArrow) {
                setIndex((i) => Math.min(THEME_OPTIONS.length - 1, i + 1));
            }
        },
        { isActive: true }
    );

    return (
        <Dialog title="选择主题" subtitle="↑/↓ 选择，Enter 确认" onConfirm={() => onSelect(THEME_OPTIONS[index]!.name)} onCancel={onCancel}>
            {THEME_OPTIONS.map((t, i) => (
                <ListItem isFocused={i === index} isSelected={t.name === current} key={t.name}>
                    {t.label}
                </ListItem>
            ))}
        </Dialog>
    );
}
