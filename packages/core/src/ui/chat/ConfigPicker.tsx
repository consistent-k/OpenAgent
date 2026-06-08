import { t } from '@oagent/i18n';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import React, { useMemo, useState } from 'react';
import { Dialog } from '../text/Dialog';
import { ListItem } from '../text/ListItem';
import { getAllModelOptions } from '@/config';

export interface ConfigItem {
    key: string;
    label: string;
    value: string;
    editable: boolean;
}

interface ConfigPickerProps {
    items: ConfigItem[];
    onSave: (key: string, value: string) => void;
    onCancel: () => void;
    onManageProviders?: () => void;
}

export function ConfigPicker({ items, onSave, onCancel, onManageProviders }: ConfigPickerProps) {
    const [index, setIndex] = useState(0);
    const [editing, setEditing] = useState<ConfigItem | null>(null);
    const [editValue, setEditValue] = useState('');
    const [selectingModel, setSelectingModel] = useState(false);
    const [modelIndex, setModelIndex] = useState(0);

    const modelOptions = useMemo(() => getAllModelOptions(), []);

    const allItems = useMemo(() => [...items, { key: 'providers', label: t('ui.configPicker.providers'), value: '', editable: false }], [items]);

    useInput(
        (_input, key) => {
            if (editing || selectingModel) return;
            if (key.upArrow) {
                setIndex((i) => Math.max(0, i - 1));
            } else if (key.downArrow) {
                setIndex((i) => Math.min(allItems.length - 1, i + 1));
            }
        },
        { isActive: true }
    );

    useInput(
        (_input, key) => {
            if (key.escape) {
                setEditing(null);
                setEditValue('');
            }
        },
        { isActive: !!editing }
    );

    useInput(
        (_input, key) => {
            if (key.escape) {
                setSelectingModel(false);
            } else if (key.upArrow) {
                setModelIndex((i) => Math.max(0, i - 1));
            } else if (key.downArrow) {
                setModelIndex((i) => Math.min(modelOptions.length - 1, i + 1));
            }
        },
        { isActive: selectingModel }
    );

    if (selectingModel) {
        return (
            <Dialog
                title={t('ui.configPicker.selectModel')}
                subtitle={t('ui.configPicker.selectModelSubtitle')}
                onConfirm={() => {
                    if (modelOptions[modelIndex]) {
                        onSave('activeModel', modelOptions[modelIndex]!);
                    }
                    setSelectingModel(false);
                }}
                onCancel={() => {
                    setSelectingModel(false);
                }}
            >
                {modelOptions.length === 0 ? (
                    <Text color="yellow">{t('ui.configPicker.noModels')}</Text>
                ) : (
                    modelOptions.map((option, i) => (
                        <ListItem key={option} isFocused={i === modelIndex}>
                            {option}
                        </ListItem>
                    ))
                )}
            </Dialog>
        );
    }

    if (editing) {
        return (
            <Dialog
                title={t('ui.configPicker.editTitle', { label: editing.label })}
                subtitle={t('ui.configPicker.editSubtitle')}
                isActive={false}
                onConfirm={() => {
                    if (editValue.trim()) {
                        onSave(editing.key, editValue.trim());
                    }
                }}
                onCancel={() => {
                    setEditing(null);
                    setEditValue('');
                }}
            >
                <Box>
                    <Text color="green">{'> '}</Text>
                    <TextInput
                        value={editValue}
                        onChange={setEditValue}
                        onSubmit={(v) => {
                            if (v.trim()) {
                                onSave(editing.key, v.trim());
                            }
                        }}
                    />
                </Box>
            </Dialog>
        );
    }

    const focusedItem = allItems[index]!;

    return (
        <Dialog
            title={t('ui.configPicker.title')}
            subtitle={t('ui.configPicker.subtitle')}
            onConfirm={
                focusedItem.key === 'providers'
                    ? onManageProviders
                    : focusedItem.key === 'activeModel'
                      ? () => {
                            setSelectingModel(true);
                            setModelIndex(0);
                        }
                      : focusedItem.editable
                        ? () => {
                              setEditing(focusedItem);
                              setEditValue(focusedItem.value);
                          }
                        : undefined
            }
            onCancel={onCancel}
        >
            {allItems.map((item, i) => (
                <ListItem
                    key={item.key}
                    isFocused={i === index}
                    disabled={!item.editable && item.key !== 'providers'}
                    description={
                        item.key === 'providers'
                            ? ''
                            : item.editable
                              ? t('ui.configPicker.currentValueShort', { value: item.value })
                              : t('ui.configPicker.currentValueNotEditable', { value: item.value })
                    }
                >
                    {item.label}
                </ListItem>
            ))}
        </Dialog>
    );
}
