import { t } from '@oagent/i18n';
import { Box } from 'ink';
import React, { useEffect, useState } from 'react';
import type { TipState } from '../../hooks/useChatStream';
import { ThemedText } from '../text/ThemedText';

interface TipsProps {
    tip: TipState;
}

export function Tips({ tip }: TipsProps) {
    const [remainMs, setRemainMs] = useState(0);

    // 当 retry 信息变化时，初始化倒计时
    useEffect(() => {
        if (!tip || tip.type !== 'retry') {
            setRemainMs(0);
            return;
        }
        setRemainMs(tip.info.retryDelayMs);

        const interval = setInterval(() => {
            setRemainMs((prev) => (prev <= 1000 ? 0 : prev - 1000));
        }, 1000);

        return () => clearInterval(interval);
    }, [tip]);

    if (!tip) return null;

    const content =
        tip.type === 'retry' ? (
            <ThemedText color="warning">
                {t('tips.retrying', {
                    attempt: String(tip.info.attempt),
                    max: String(tip.info.maxRetries),
                    delay: Math.ceil(remainMs / 1000)
                })}
            </ThemedText>
        ) : (
            <ThemedText color="error">⚠️ {tip.message}</ThemedText>
        );

    return (
        <Box paddingX={1} marginBottom={1}>
            {content}
        </Box>
    );
}
