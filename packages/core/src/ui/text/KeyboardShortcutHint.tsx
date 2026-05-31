import { Text } from 'ink';
import React from 'react';

interface KeyboardShortcutHintProps {
    shortcut: string;
    action: string;
    parens?: boolean;
    bold?: boolean;
}

export function KeyboardShortcutHint({ shortcut, action, parens, bold }: KeyboardShortcutHintProps) {
    const shortcutEl = bold ? <Text bold>{shortcut}</Text> : shortcut;

    if (parens) {
        return (
            <Text>
                ({shortcutEl} to {action})
            </Text>
        );
    }

    return (
        <Text>
            {shortcutEl} to {action}
        </Text>
    );
}
