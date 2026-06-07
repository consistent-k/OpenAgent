import { t } from '@oagent/i18n';
import { Box, Text, useInput } from 'ink';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Dialog } from '@/ui/text/Dialog';
import { ListItem } from '@/ui/text/ListItem';
import { formatSessionTime, type SessionSummary } from '@/utils/sessions';

interface Props {
    sessions: SessionSummary[];
    onSelect: (sessionId: string) => void;
    onCancel: () => void;
    onDelete?: (sessionId: string) => void;
}

function truncate(text: string, max: number): string {
    if (text.length <= max) return text;
    return text.slice(0, max - 1) + '…';
}

function getDisplayLabel(session: SessionSummary): string {
    const time = formatSessionTime(new Date(session.savedAt));
    if (session.firstUserMessage) {
        return `${truncate(session.firstUserMessage, 50)}  ${time}`;
    }
    return time;
}

function Scrollbar({ total, offset, visible }: { total: number; offset: number; visible: number }) {
    if (total <= visible) return null;
    const barHeight = Math.max(1, Math.round((visible / total) * visible));
    const barPos = Math.round((offset / (total - visible)) * (visible - barHeight));
    const lines: string[] = [];
    for (let i = 0; i < visible; i++) {
        lines.push(i >= barPos && i < barPos + barHeight ? '█' : '░');
    }
    return (
        <Box flexDirection="column" marginLeft={1} justifyContent="flex-end">
            {lines.map((ch, i) => (
                <Text key={i} dimColor>
                    {ch}
                </Text>
            ))}
        </Box>
    );
}

export function SessionPicker({ sessions, onSelect, onCancel, onDelete }: Props) {
    const [selectedIdx, setSelectedIdx] = useState(0);
    const selectedIdxRef = useRef(0);
    const [scrollOffset, setScrollOffset] = useState(0);
    const VISIBLE_COUNT = 10;

    const sorted = useMemo(() => [...sessions].sort((a, b) => b.savedAt.localeCompare(a.savedAt)), [sessions]);

    // Clamp scroll offset
    const maxOffset = Math.max(0, sorted.length - VISIBLE_COUNT);
    const clampedOffset = Math.min(scrollOffset, maxOffset);
    const visibleSessions = sorted.slice(clampedOffset, clampedOffset + VISIBLE_COUNT);

    // 同步 ref
    selectedIdxRef.current = selectedIdx;

    useInput(
        useCallback(
            (input, key) => {
                if (key.upArrow || input === 'k') {
                    setSelectedIdx((prev) => {
                        const next = prev - 1;
                        if (next < 0) return sorted.length - 1;
                        return next;
                    });
                } else if (key.downArrow || input === 'j') {
                    setSelectedIdx((prev) => (prev + 1) % sorted.length);
                } else if (key.pageUp) {
                    setSelectedIdx((prev) => Math.max(0, prev - VISIBLE_COUNT));
                } else if (key.pageDown) {
                    setSelectedIdx((prev) => Math.min(sorted.length - 1, prev + VISIBLE_COUNT));
                } else if (key.return) {
                    const session = sorted[selectedIdxRef.current];
                    if (session) {
                        onSelect(session.sessionId);
                    }
                } else if ((key.delete || key.backspace) && onDelete) {
                    const session = sorted[selectedIdxRef.current];
                    if (session) {
                        onDelete(session.sessionId);
                    }
                }
            },
            [sorted, onSelect, onDelete]
        )
    );

    // Auto-scroll to keep selected item visible
    React.useEffect(() => {
        if (selectedIdx < clampedOffset) {
            setScrollOffset(selectedIdx);
        } else if (selectedIdx >= clampedOffset + VISIBLE_COUNT) {
            setScrollOffset(selectedIdx - VISIBLE_COUNT + 1);
        }
    }, [selectedIdx, clampedOffset]);

    const rangeText =
        sorted.length > 0
            ? t('ui.sessionPicker.range', {
                  from: clampedOffset + 1,
                  to: Math.min(clampedOffset + VISIBLE_COUNT, sorted.length),
                  total: sorted.length
              })
            : '';

    if (sorted.length === 0) {
        return (
            <Dialog title={t('ui.sessionPicker.title')} onCancel={onCancel}>
                <Box paddingX={1}>
                    <Text dimColor>{t('ui.sessionPicker.empty')}</Text>
                </Box>
            </Dialog>
        );
    }

    return (
        <Dialog title={t('ui.sessionPicker.title')} subtitle={t('ui.sessionPicker.subtitle')} onConfirm={() => onSelect(sorted[selectedIdx]!.sessionId)} onCancel={onCancel}>
            <Box flexDirection="row">
                <Box flexDirection="column" flexGrow={1}>
                    {visibleSessions.map((session, idx) => {
                        const globalIdx = clampedOffset + idx;
                        const label = getDisplayLabel(session);
                        const shortId = session.sessionId.slice(0, 8);
                        return (
                            <ListItem key={session.sessionId} isFocused={globalIdx === selectedIdx} description={`${shortId}`}>
                                {label}
                            </ListItem>
                        );
                    })}
                </Box>
                <Scrollbar total={sorted.length} offset={clampedOffset} visible={Math.min(VISIBLE_COUNT, sorted.length)} />
            </Box>
            {rangeText && (
                <Box paddingX={1} marginTop={1}>
                    <Text dimColor>{rangeText}</Text>
                </Box>
            )}
        </Dialog>
    );
}
