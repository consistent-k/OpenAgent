import { t } from '@oagent/i18n';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import React, { useState } from 'react';
import { Dialog } from '../text/Dialog';
import { ListItem } from '../text/ListItem';

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
}

export function ConfigPicker({ items, onSave, onCancel }: ConfigPickerProps) {
    const [index, setIndex] = useState(0);
    const [editing, setEditing] = useState<ConfigItem | null>(null);
    const [editValue, setEditValue] = useState('');

    useInput(
        (_input, key) => {
            if (editing) return;
            if (key.upArrow) {
                setIndex((i) => Math.max(0, i - 1));
            } else if (key.downArrow) {
                setIndex((i) => Math.min(items.length - 1, i + 1));
            }
        },
        { isActive: true }
    );

    if (editing) {
        return (
            <Dialog
                title={t('ui.configPicker.editTitle', { label: editing.label })}
                subtitle={t('ui.configPicker.currentValue', { value: editing.value })}
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

    const focusedItem = items[index]!;

    return (
        <Dialog
            title={t('ui.configPicker.title')}
            subtitle={t('ui.configPicker.subtitle')}
            onConfirm={
                focusedItem.editable
                    ? () => {
                          setEditing(focusedItem);
                          setEditValue(focusedItem.value);
                      }
                    : undefined
            }
            onCancel={onCancel}
        >
            {items.map((item, i) => (
                <ListItem
                    key={item.key}
                    isFocused={i === index}
                    disabled={!item.editable}
                    description={item.editable ? t('ui.configPicker.currentValueShort', { value: item.value }) : t('ui.configPicker.currentValueNotEditable', { value: item.value })}
                >
                    {item.label}
                </ListItem>
            ))}
        </Dialog>
    );
}
