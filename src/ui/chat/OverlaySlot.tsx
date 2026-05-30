import React from 'react';
import type { PendingToolApproval } from '../../hooks/useChatStream';
import type { SessionSummary } from '../../utils/sessions';
import type { ThemeName } from '../text/theme';
import { ApprovalDialog } from './ApprovalDialog';
import type { ConfigItem } from './ConfigPicker';
import { ConfigPicker } from './ConfigPicker';
import { SessionPicker } from './SessionPicker';
import { ThemePicker } from './ThemePicker';
import type { OverlayType } from './useInputMode';

interface OverlaySlotProps {
    overlayType: OverlayType;
    // Approval
    pendingApproval: PendingToolApproval | null;
    onApprove: () => void;
    onAlwaysApprove: () => void;
    onDeny: (reason?: string) => void;
    onSelectOption: (optionText: string) => void;
    // Session picker
    sessionPicker: SessionSummary[] | null;
    onSelectSession: (name: string) => void;
    // Theme picker
    themePicker: ThemeName | null;
    onSelectTheme: (name: ThemeName) => void;
    // Config picker
    configPicker: ConfigItem[] | null;
    onSaveConfig: (key: string, value: string) => void;
    // Unified cancel (Escape or picker's own cancel)
    onCancelPicker: () => void;
}

export function OverlaySlot({
    overlayType,
    pendingApproval,
    onApprove,
    onAlwaysApprove,
    onDeny,
    onSelectOption,
    sessionPicker,
    onSelectSession,
    themePicker,
    onSelectTheme,
    configPicker,
    onSaveConfig,
    onCancelPicker
}: OverlaySlotProps) {
    if (overlayType === 'approval' && pendingApproval) {
        return <ApprovalDialog pending={pendingApproval} onApprove={onApprove} onAlwaysApprove={onAlwaysApprove} onDeny={onDeny} onSelectOption={onSelectOption} />;
    }

    if (overlayType === 'session' && sessionPicker) {
        return <SessionPicker sessions={sessionPicker} onSelect={onSelectSession} onCancel={onCancelPicker} />;
    }

    if (overlayType === 'theme' && themePicker) {
        return <ThemePicker current={themePicker} onSelect={onSelectTheme} onCancel={onCancelPicker} />;
    }

    if (overlayType === 'config' && configPicker) {
        return <ConfigPicker items={configPicker} onSave={onSaveConfig} onCancel={onCancelPicker} />;
    }

    return null;
}
