import { t } from '@oagent/i18n';
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

function getThemeOptions() {
    return [
        { name: 'dark' as ThemeName, label: t('ui.themePicker.dark') },
        { name: 'light' as ThemeName, label: t('ui.themePicker.light') },
        { name: 'mayday' as ThemeName, label: t('ui.themePicker.mayday') }
    ];
}

export function ThemePicker({ current, onSelect, onCancel }: ThemePickerProps) {
    const themeOptions = getThemeOptions();
    const [index, setIndex] = useState(() => themeOptions.findIndex((t) => t.name === current));

    useInput(
        (_input, key) => {
            if (key.upArrow) {
                setIndex((i) => Math.max(0, i - 1));
            } else if (key.downArrow) {
                setIndex((i) => Math.min(themeOptions.length - 1, i + 1));
            }
        },
        { isActive: true }
    );

    return (
        <Dialog title={t('ui.themePicker.title')} subtitle={t('ui.themePicker.subtitle')} onConfirm={() => onSelect(themeOptions[index]!.name)} onCancel={onCancel}>
            {themeOptions.map((opt, i) => (
                <ListItem isFocused={i === index} isSelected={opt.name === current} key={opt.name}>
                    {opt.label}
                </ListItem>
            ))}
        </Dialog>
    );
}
