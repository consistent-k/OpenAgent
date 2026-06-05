import { t } from '@oagent/i18n';
import { Box, Text, useInput } from 'ink';
import React, { useCallback } from 'react';
import { Byline } from './Byline';
import { KeyboardShortcutHint } from './KeyboardShortcutHint';
import { Pane } from './Pane';
import type { StringThemeKeys } from './theme';

interface DialogProps {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    children: React.ReactNode;
    onConfirm?: () => void;
    onCancel?: () => void;
    color?: StringThemeKeys;
    /** 是否激活键盘监听（默认 true） */
    isActive?: boolean;
}

export function Dialog({ title, subtitle, children, onConfirm, onCancel, color = 'suggestion', isActive = true }: DialogProps) {
    useInput(
        useCallback(
            (_input, key) => {
                if (key.return) {
                    onConfirm?.();
                } else if (key.escape) {
                    onCancel?.();
                }
            },
            [onConfirm, onCancel]
        ),
        { isActive }
    );

    return (
        <Pane color={color}>
            <Box flexDirection="column" gap={1}>
                <Box flexDirection="column">
                    <Text bold color={color}>
                        {title}
                    </Text>
                    {subtitle && <Text dimColor>{subtitle}</Text>}
                </Box>
                {children}
                <Box marginTop={1}>
                    <Text dimColor italic>
                        <Byline>
                            {onConfirm && <KeyboardShortcutHint shortcut={t('ui.dialog.enter')} action={t('ui.dialog.confirm')} />}
                            <KeyboardShortcutHint shortcut={t('ui.dialog.esc')} action={t('ui.dialog.cancel')} />
                        </Byline>
                    </Text>
                </Box>
            </Box>
        </Pane>
    );
}
