import { t } from '@oagent/i18n';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import React, { useCallback, useState } from 'react';
import { Dialog } from '../text/Dialog';
import { ListItem } from '../text/ListItem';

interface ModelPickerProps {
    providerName: string;
    models: string[];
    onAdd: (modelName: string) => void;
    onDelete: (modelName: string) => void;
    onCancel: () => void;
}

export function ModelPicker({ providerName, models, onAdd, onDelete, onCancel }: ModelPickerProps) {
    const [index, setIndex] = useState(0);
    const [adding, setAdding] = useState(false);
    const [addValue, setAddValue] = useState('');
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    const allItems = [{ type: 'add' as const }, ...models.map((m) => ({ type: 'model' as const, name: m }))];

    useInput(
        useCallback(
            (input, key) => {
                if (adding || confirmDelete) return;
                if (key.upArrow || input === 'k') {
                    setIndex((i) => Math.max(0, i - 1));
                } else if (key.downArrow || input === 'j') {
                    setIndex((i) => Math.min(allItems.length - 1, i + 1));
                } else if (input === 'a') {
                    setAdding(true);
                    setAddValue('');
                } else if (key.backspace || key.delete) {
                    const item = allItems[index];
                    if (item?.type === 'model') {
                        setConfirmDelete(item.name);
                    }
                }
            },
            [allItems, index, adding, confirmDelete]
        )
    );

    // Confirm delete mode
    if (confirmDelete) {
        return (
            <Dialog
                title={t('ui.modelPicker.confirmDelete', { model: confirmDelete })}
                subtitle={t('ui.modelPicker.confirmDeleteSubtitle')}
                onConfirm={() => {
                    onDelete(confirmDelete);
                    setConfirmDelete(null);
                    setIndex((i) => Math.max(0, i - 1));
                }}
                onCancel={() => setConfirmDelete(null)}
            >
                <Box paddingX={1}>
                    <Text color="red">{confirmDelete}</Text>
                </Box>
            </Dialog>
        );
    }

    // Add model mode
    if (adding) {
        return (
            <Dialog
                title={t('ui.modelPicker.inputModel')}
                isActive={false}
                onConfirm={() => {
                    if (addValue.trim()) {
                        onAdd(addValue.trim());
                        setAdding(false);
                        setAddValue('');
                    }
                }}
                onCancel={() => {
                    setAdding(false);
                    setAddValue('');
                }}
            >
                <Box>
                    <Text color="green">{'> '}</Text>
                    <TextInput
                        value={addValue}
                        onChange={setAddValue}
                        onSubmit={(v) => {
                            if (v.trim()) {
                                onAdd(v.trim());
                                setAdding(false);
                                setAddValue('');
                            }
                        }}
                    />
                </Box>
            </Dialog>
        );
    }

    const focusedItem = allItems[index];

    return (
        <Dialog
            title={t('ui.modelPicker.title', { provider: providerName })}
            subtitle={t('ui.modelPicker.subtitle')}
            onConfirm={
                focusedItem?.type === 'add'
                    ? () => {
                          setAdding(true);
                          setAddValue('');
                      }
                    : undefined
            }
            onCancel={onCancel}
        >
            {models.length === 0 ? (
                <Box paddingX={1}>
                    <Text dimColor>{t('ui.modelPicker.empty')}</Text>
                </Box>
            ) : (
                allItems.map((item, i) => (
                    <ListItem key={item.type === 'add' ? 'add' : item.name} isFocused={i === index}>
                        {item.type === 'add' ? t('ui.modelPicker.addModel') : item.name}
                    </ListItem>
                ))
            )}
        </Dialog>
    );
}
