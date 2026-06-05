import React from 'react';
import type { ProviderConfig } from '../../config';
import type { PendingToolApproval } from '../../hooks/useChatStream';
import type { SessionSummary } from '../../utils/sessions';
import type { ThemeName } from '../text/theme';
import { ApprovalDialog } from './ApprovalDialog';
import type { ConfigItem } from './ConfigPicker';
import { ConfigPicker } from './ConfigPicker';
import { ProviderPicker } from './ProviderPicker';
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
    onDeleteSession: (name: string) => void;
    // Theme picker
    themePicker: ThemeName | null;
    onSelectTheme: (name: ThemeName) => void;
    // Config picker
    configPicker: ConfigItem[] | null;
    onSaveConfig: (key: string, value: string) => void;
    onManageProviders?: () => void;
    onBackToConfig?: () => void;
    // Provider picker
    providerPickerOpen: boolean;
    providerList: ProviderConfig[];
    activeProviderName: string;
    onAddProvider: (provider: ProviderConfig) => void;
    onUpdateProvider: (name: string, updates: Partial<Omit<ProviderConfig, 'name'>> & { newName?: string }) => void;
    onDeleteProvider: (name: string) => void;
    onSetActiveProvider: (name: string) => void;
    onAddModel: (providerName: string, modelName: string) => void;
    onDeleteModel: (providerName: string, modelName: string) => void;
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
    onDeleteSession,
    themePicker,
    onSelectTheme,
    configPicker,
    onSaveConfig,
    onManageProviders,
    onBackToConfig,
    providerPickerOpen,
    providerList,
    activeProviderName,
    onAddProvider,
    onUpdateProvider,
    onDeleteProvider,
    onSetActiveProvider,
    onAddModel,
    onDeleteModel,
    onCancelPicker
}: OverlaySlotProps) {
    if (overlayType === 'approval' && pendingApproval) {
        return <ApprovalDialog pending={pendingApproval} onApprove={onApprove} onAlwaysApprove={onAlwaysApprove} onDeny={onDeny} onSelectOption={onSelectOption} />;
    }

    if (overlayType === 'session' && sessionPicker) {
        return <SessionPicker sessions={sessionPicker} onSelect={onSelectSession} onCancel={onCancelPicker} onDelete={onDeleteSession} />;
    }

    if (overlayType === 'theme' && themePicker) {
        return <ThemePicker current={themePicker} onSelect={onSelectTheme} onCancel={onCancelPicker} />;
    }

    if (overlayType === 'config' && configPicker) {
        return <ConfigPicker items={configPicker} onSave={onSaveConfig} onCancel={onCancelPicker} onManageProviders={onManageProviders} />;
    }

    if (overlayType === 'provider' && providerPickerOpen) {
        return (
            <ProviderPicker
                providers={providerList}
                activeProviderName={activeProviderName}
                onAdd={onAddProvider}
                onUpdate={onUpdateProvider}
                onDelete={onDeleteProvider}
                onSetActive={onSetActiveProvider}
                onAddModel={onAddModel}
                onDeleteModel={onDeleteModel}
                onBack={onBackToConfig ?? onCancelPicker}
            />
        );
    }

    return null;
}
