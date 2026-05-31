import { useInput } from 'ink';
import React, { useState } from 'react';
import type { SessionSummary } from '../../utils/sessions';
import { Dialog } from '../text/Dialog';
import { ListItem } from '../text/ListItem';

interface SessionPickerProps {
    sessions: SessionSummary[];
    onSelect: (name: string) => void;
    onCancel: () => void;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleString();
}

export function SessionPicker({ sessions, onSelect, onCancel }: SessionPickerProps) {
    const [index, setIndex] = useState(0);

    useInput(
        (_input, key) => {
            if (key.upArrow) {
                setIndex((i) => Math.max(0, i - 1));
            } else if (key.downArrow) {
                setIndex((i) => Math.min(sessions.length - 1, i + 1));
            }
        },
        { isActive: true }
    );

    return (
        <Dialog title="已保存会话" subtitle="↑/↓ 选择，Enter 恢复" onConfirm={() => onSelect(sessions[index]!.name)} onCancel={onCancel}>
            {sessions.map((s, i) => (
                <ListItem isFocused={i === index} key={s.name} description={formatDate(s.savedAt)}>
                    {s.name}
                </ListItem>
            ))}
        </Dialog>
    );
}
