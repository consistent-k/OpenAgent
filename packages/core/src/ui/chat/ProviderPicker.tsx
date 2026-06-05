import { t } from '@oagent/i18n';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import React, { useCallback, useState } from 'react';
import type { ProviderConfig } from '../../config';
import { Dialog } from '../text/Dialog';
import { ListItem } from '../text/ListItem';
import { ModelPicker } from './ModelPicker';

// ── Props ──

interface ProviderPickerProps {
    providers: ProviderConfig[];
    activeProviderName: string;
    onAdd: (provider: ProviderConfig) => void;
    onUpdate: (name: string, updates: Partial<Omit<ProviderConfig, 'name'>> & { newName?: string }) => void;
    onDelete: (name: string) => void;
    onSetActive: (name: string) => void;
    onAddModel: (providerName: string, modelName: string) => void;
    onDeleteModel: (providerName: string, modelName: string) => void;
    /** 返回上一级（回到 /config 页面） */
    onBack: () => void;
}

// ── View types ──

type ViewType = 'list' | 'detail' | 'form' | 'models';

// ── Form step ──

interface FormStep {
    key: string;
    label: string;
    placeholder: string;
}

const FORM_STEPS: FormStep[] = [
    { key: 'name', label: t('ui.providerForm.name'), placeholder: t('ui.providerForm.namePlaceholder') },
    { key: 'baseUrl', label: t('ui.providerForm.baseUrl'), placeholder: t('ui.providerForm.baseUrlPlaceholder') },
    { key: 'apiKey', label: t('ui.providerForm.apiKey'), placeholder: t('ui.providerForm.apiKeyPlaceholder') },
    { key: 'models', label: t('ui.providerForm.models'), placeholder: t('ui.providerForm.modelsPlaceholder') }
];

// ── Main component ──

export function ProviderPicker({ providers, activeProviderName, onAdd, onUpdate, onDelete, onSetActive, onAddModel, onDeleteModel, onBack }: ProviderPickerProps) {
    const [view, setView] = useState<ViewType>('list');
    const [listIndex, setListIndex] = useState(0);
    const [detailIndex, setDetailIndex] = useState(0);
    const [selectedProvider, setSelectedProvider] = useState<ProviderConfig | null>(null);

    // Form state
    const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
    const [formStep, setFormStep] = useState(0);
    const [formValues, setFormValues] = useState({ name: '', baseUrl: '', apiKey: '', models: '' });

    // Delete confirmation
    const [confirmDelete, setConfirmDelete] = useState(false);

    // ── List view ──

    const listItems = [{ type: 'add' as const }, ...providers.map((p) => ({ type: 'provider' as const, provider: p }))];

    useInput(
        useCallback(
            (input, key) => {
                if (view !== 'list') return;
                if (key.upArrow || input === 'k') {
                    setListIndex((i) => Math.max(0, i - 1));
                } else if (key.downArrow || input === 'j') {
                    setListIndex((i) => Math.min(listItems.length - 1, i + 1));
                } else if (input === 'a') {
                    setFormMode('add');
                    setFormStep(0);
                    setFormValues({ name: '', baseUrl: '', apiKey: '', models: '' });
                    setView('form');
                } else if (key.return) {
                    const item = listItems[listIndex];
                    if (item?.type === 'add') {
                        setFormMode('add');
                        setFormStep(0);
                        setFormValues({ name: '', baseUrl: '', apiKey: '', models: '' });
                        setView('form');
                    } else if (item?.type === 'provider') {
                        setSelectedProvider(item.provider);
                        setDetailIndex(0);
                        setView('detail');
                    }
                } else if (key.backspace || key.delete) {
                    const item = listItems[listIndex];
                    if (item?.type === 'provider') {
                        setSelectedProvider(item.provider);
                        setConfirmDelete(true);
                    }
                }
            },
            [view, listItems, listIndex]
        )
    );

    // ── Detail view ──

    const detailItems = [
        { key: 'name', label: t('ui.providerDetail.name') },
        { key: 'baseUrl', label: t('ui.providerDetail.baseUrl') },
        { key: 'apiKey', label: t('ui.providerDetail.apiKey') },
        { key: 'models', label: t('ui.providerDetail.models') },
        { key: 'setActive', label: t('ui.providerDetail.setActive') },
        { key: 'delete', label: t('ui.providerDetail.delete') }
    ];

    useInput(
        useCallback(
            (input, key) => {
                if (view !== 'detail' || confirmDelete) return;
                if (key.escape) {
                    setView('list');
                } else if (key.upArrow || input === 'k') {
                    setDetailIndex((i) => Math.max(0, i - 1));
                } else if (key.downArrow || input === 'j') {
                    setDetailIndex((i) => Math.min(detailItems.length - 1, i + 1));
                } else if (key.return) {
                    const item = detailItems[detailIndex];
                    if (!item || !selectedProvider) return;
                    if (item.key === 'models') {
                        setView('models');
                    } else if (item.key === 'setActive') {
                        onSetActive(selectedProvider.name);
                        setView('list');
                    } else if (item.key === 'delete') {
                        setConfirmDelete(true);
                    } else if (item.key === 'name') {
                        setFormMode('edit');
                        setFormValues({
                            name: selectedProvider.name,
                            baseUrl: selectedProvider.baseUrl,
                            apiKey: selectedProvider.apiKey,
                            models: selectedProvider.models.join(', ')
                        });
                        setFormStep(0);
                        setView('form');
                    } else if (item.key === 'baseUrl') {
                        setFormMode('edit');
                        setFormValues({
                            name: selectedProvider.name,
                            baseUrl: selectedProvider.baseUrl,
                            apiKey: selectedProvider.apiKey,
                            models: selectedProvider.models.join(', ')
                        });
                        setFormStep(1);
                        setView('form');
                    } else if (item.key === 'apiKey') {
                        setFormMode('edit');
                        setFormValues({
                            name: selectedProvider.name,
                            baseUrl: selectedProvider.baseUrl,
                            apiKey: selectedProvider.apiKey,
                            models: selectedProvider.models.join(', ')
                        });
                        setFormStep(2);
                        setView('form');
                    }
                }
            },
            [view, confirmDelete, detailItems, detailIndex, selectedProvider, onSetActive]
        )
    );

    // ── Delete confirmation ──

    useInput(
        useCallback(
            (input, key) => {
                if (!confirmDelete) return;
                if (key.return) {
                    if (selectedProvider) {
                        onDelete(selectedProvider.name);
                    }
                    setConfirmDelete(false);
                    setSelectedProvider(null);
                    setView('list' as ViewType);
                } else if (key.escape) {
                    setConfirmDelete(false);
                }
            },
            [confirmDelete, selectedProvider, onDelete]
        )
    );

    // ── Form view Esc handling ──

    useInput(
        useCallback(
            (input, key) => {
                if (view !== 'form') return;
                if (key.escape) {
                    if (formMode === 'edit') {
                        setView('detail');
                    } else if (formStep > 0) {
                        setFormStep(formStep - 1);
                    } else {
                        setView('list');
                    }
                }
            },
            [view, formMode, formStep]
        )
    );

    // ── Form view ──

    const handleFormSubmit = useCallback(
        (value: string) => {
            if (formMode === 'add') {
                if (formStep < FORM_STEPS.length - 1) {
                    const newValues = { ...formValues, [FORM_STEPS[formStep]!.key]: value };
                    setFormValues(newValues);
                    setFormStep(formStep + 1);
                } else {
                    // Final step — create provider
                    const finalValues = { ...formValues, models: value };
                    const modelsList = finalValues.models
                        .split(',')
                        .map((m) => m.trim())
                        .filter(Boolean);
                    onAdd({
                        name: finalValues.name,
                        baseUrl: finalValues.baseUrl,
                        apiKey: finalValues.apiKey,
                        models: modelsList
                    });
                    setView('list');
                }
            } else {
                // Edit mode — single field update
                const stepKey = FORM_STEPS[formStep]!.key;
                if (selectedProvider) {
                    if (stepKey === 'name') {
                        onUpdate(selectedProvider.name, { newName: value });
                    } else if (stepKey === 'baseUrl') {
                        onUpdate(selectedProvider.name, { baseUrl: value });
                    } else if (stepKey === 'apiKey') {
                        onUpdate(selectedProvider.name, { apiKey: value });
                    }
                }
                setView('detail');
            }
        },
        [formMode, formStep, formValues, selectedProvider, onAdd, onUpdate]
    );

    // ── Render: List view ──

    if (view === 'list') {
        const focusedItem = listItems[listIndex];
        return (
            <Dialog
                title={t('ui.providerPicker.title')}
                subtitle={t('ui.providerPicker.subtitle')}
                onConfirm={
                    focusedItem?.type === 'add'
                        ? () => {
                              setFormMode('add');
                              setFormStep(0);
                              setFormValues({ name: '', baseUrl: '', apiKey: '', models: '' });
                              setView('form');
                          }
                        : focusedItem?.type === 'provider'
                          ? () => {
                                setSelectedProvider(focusedItem.provider);
                                setDetailIndex(0);
                                setView('detail');
                            }
                          : undefined
                }
                onCancel={onBack}
            >
                {providers.length === 0 && listIndex === 0 ? (
                    <Box paddingX={1}>
                        <Text dimColor>{t('ui.providerPicker.empty')}</Text>
                    </Box>
                ) : (
                    listItems.map((item, i) => {
                        if (item.type === 'add') {
                            return (
                                <ListItem key="add" isFocused={i === listIndex}>
                                    {t('ui.providerPicker.addProvider')}
                                </ListItem>
                            );
                        }
                        const p = item.provider;
                        const isActive = p.name === activeProviderName;
                        return (
                            <ListItem key={p.name} isFocused={i === listIndex} description={`${p.baseUrl} · ${t('ui.providerPicker.models', { count: p.models.length })}`}>
                                {isActive ? `✓ ${p.name} (${t('ui.providerPicker.active')})` : p.name}
                            </ListItem>
                        );
                    })
                )}
            </Dialog>
        );
    }

    // ── Render: Delete confirmation ──

    if (confirmDelete && selectedProvider) {
        return (
            <Dialog
                title={t('ui.providerDetail.confirmDelete', { name: selectedProvider.name })}
                subtitle={t('ui.providerDetail.confirmDeleteSubtitle')}
                isActive={false}
                onConfirm={() => {
                    onDelete(selectedProvider.name);
                    setConfirmDelete(false);
                    setSelectedProvider(null);
                    setView('list');
                }}
            >
                <Box paddingX={1}>
                    <Text color="red">{selectedProvider.name}</Text>
                </Box>
            </Dialog>
        );
    }

    // ── Render: Detail view ──

    if (view === 'detail' && selectedProvider) {
        const isActive = selectedProvider.name === activeProviderName;
        const maskedKey = selectedProvider.apiKey ? (selectedProvider.apiKey.length <= 8 ? '****' : `${selectedProvider.apiKey.slice(0, 4)}...${selectedProvider.apiKey.slice(-4)}`) : '-';
        const detailValues: Record<string, string> = {
            name: selectedProvider.name + (isActive ? ` ${t('ui.providerDetail.isCurrent')}` : ''),
            baseUrl: selectedProvider.baseUrl || '-',
            apiKey: maskedKey,
            models: selectedProvider.models.length > 0 ? selectedProvider.models.join(', ') : '-'
        };

        return (
            <Dialog
                title={t('ui.providerDetail.title', { name: selectedProvider.name })}
                subtitle={t('ui.providerDetail.subtitle')}
                isActive={false}
                onConfirm={() => {
                    const item = detailItems[detailIndex];
                    if (!item) return;
                    if (item.key === 'models') {
                        setView('models');
                    } else if (item.key === 'setActive') {
                        onSetActive(selectedProvider.name);
                        setView('list');
                    } else if (item.key === 'delete') {
                        setConfirmDelete(true);
                    } else {
                        setFormMode('edit');
                        setFormValues({
                            name: selectedProvider.name,
                            baseUrl: selectedProvider.baseUrl,
                            apiKey: selectedProvider.apiKey,
                            models: selectedProvider.models.join(', ')
                        });
                        const stepIdx = FORM_STEPS.findIndex((s) => s.key === item.key);
                        setFormStep(stepIdx >= 0 ? stepIdx : 0);
                        setView('form');
                    }
                }}
            >
                {detailItems.map((item, i) => (
                    <ListItem key={item.key} isFocused={i === detailIndex} description={item.key === 'setActive' || item.key === 'delete' ? '' : detailValues[item.key]}>
                        {item.label}
                    </ListItem>
                ))}
            </Dialog>
        );
    }

    // ── Render: Models view ──

    if (view === 'models' && selectedProvider) {
        return (
            <ModelPicker
                providerName={selectedProvider.name}
                models={selectedProvider.models}
                onAdd={(modelName) => onAddModel(selectedProvider.name, modelName)}
                onDelete={(modelName) => onDeleteModel(selectedProvider.name, modelName)}
                onCancel={() => {
                    // Refresh selected provider from providers list
                    const updated = providers.find((p) => p.name === selectedProvider.name);
                    if (updated) setSelectedProvider(updated);
                    setView('detail');
                }}
            />
        );
    }

    // ── Render: Form view ──

    if (view === 'form') {
        const step = FORM_STEPS[formStep]!;
        const title = formMode === 'add' ? t('ui.providerForm.title') : t('ui.providerForm.editTitle', { name: selectedProvider?.name ?? '' });
        const currentValue = formValues[step.key as keyof typeof formValues] || '';

        return (
            <Dialog
                title={title}
                subtitle={formMode === 'add' ? t('ui.providerForm.step', { current: formStep + 1, total: FORM_STEPS.length }) : undefined}
                isActive={false}
                onConfirm={() => {
                    /* Enter is handled by TextInput onSubmit */
                }}
            >
                <Box flexDirection="column" gap={1}>
                    <Text color="green">{step.label}</Text>
                    <Box>
                        <Text color="green">{'> '}</Text>
                        <TextInput
                            value={formStep === formStep ? (formMode === 'add' && formStep === FORM_STEPS.length - 1 ? formValues.models : currentValue) : currentValue}
                            placeholder={step.placeholder}
                            onChange={(v) => {
                                const key = step.key as keyof typeof formValues;
                                setFormValues((prev) => ({ ...prev, [key]: v }));
                            }}
                            onSubmit={(v) => handleFormSubmit(v)}
                        />
                    </Box>
                    {formMode === 'edit' && (
                        <Box paddingX={1}>
                            <Text dimColor>
                                {t('ui.configPicker.currentValueShort', {
                                    value: step.key === 'apiKey' ? maskedApiKey(selectedProvider?.apiKey ?? '') : ((selectedProvider?.[step.key as keyof ProviderConfig] as string) ?? '')
                                })}
                            </Text>
                        </Box>
                    )}
                </Box>
            </Dialog>
        );
    }

    return null;
}

function maskedApiKey(key: string): string {
    if (!key) return '-';
    return key.length <= 8 ? '****' : `${key.slice(0, 4)}...${key.slice(-4)}`;
}
