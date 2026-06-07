import { t } from '@oagent/i18n';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import React, { useEffect, useState } from 'react';
import type { PendingToolApproval } from '../../hooks/useChatStream';
import { summarizeArgs } from '../../utils/summarize-args';
import { Dialog } from '../text/Dialog';
import { ListItem } from '../text/ListItem';

function getApprovalOptions() {
    return [t('ui.approval.approve'), t('ui.approval.alwaysApprove'), t('ui.approval.deny')] as const;
}

function isAskUserQuestion(pending: PendingToolApproval): boolean {
    return pending.toolName === 'ask_user_question';
}

function extractQuestionOptions(input: unknown): string[] {
    if (typeof input !== 'object' || input === null) return [];
    const opts = (input as Record<string, unknown>).options;
    if (!Array.isArray(opts)) return [];
    return opts.filter((o): o is string => typeof o === 'string');
}

function extractQuestionText(input: unknown): string {
    if (typeof input !== 'object' || input === null) return '';
    const q = (input as Record<string, unknown>).question;
    return typeof q === 'string' ? q : '';
}

interface ApprovalDialogProps {
    pending: PendingToolApproval;
    onApprove: () => void;
    onAlwaysApprove: () => void;
    onDeny: (reason?: string) => void;
    onSelectOption: (optionText: string) => void;
}

export function ApprovalDialog({ pending, onApprove, onAlwaysApprove, onDeny, onSelectOption }: ApprovalDialogProps) {
    const [index, setIndex] = useState(0);
    const [customInputMode, setCustomInputMode] = useState(false);
    const [customText, setCustomText] = useState('');

    const isQuestion = isAskUserQuestion(pending);
    const questionOptions = isQuestion ? extractQuestionOptions(pending.input) : [];
    const questionText = isQuestion ? extractQuestionText(pending.input) : '';

    // All selectable items: options + custom input entry
    const allItems = isQuestion ? [...questionOptions, t('ui.approval.customInput')] : [];

    useEffect(() => {
        setIndex(0);
        setCustomInputMode(false);
        setCustomText('');
    }, [pending]);

    const approvalOptions = getApprovalOptions();
    const maxIndex = isQuestion ? allItems.length - 1 : approvalOptions.length - 1;

    useInput(
        (_input, key) => {
            if (customInputMode) {
                if (key.escape) {
                    setCustomInputMode(false);
                    setCustomText('');
                }
                return;
            }
            if (key.upArrow) {
                setIndex((i) => Math.max(0, i - 1));
            } else if (key.downArrow) {
                setIndex((i) => Math.min(maxIndex, i + 1));
            }
        },
        { isActive: true }
    );

    // ask_user_question with custom input mode
    if (isQuestion && customInputMode) {
        return (
            <Dialog
                title={questionText || `${pending.toolName}(${summarizeArgs(pending.input)})`}
                subtitle={t('ui.approval.customInputHint')}
                isActive={false}
                onConfirm={() => onSelectOption(customText)}
                onCancel={() => {
                    setCustomInputMode(false);
                    setCustomText('');
                }}
            >
                <Box>
                    <Text color="suggestion">{'❯ '}</Text>
                    <TextInput value={customText} onChange={setCustomText} onSubmit={(v) => onSelectOption(v || customText)} />
                </Box>
            </Dialog>
        );
    }

    // ask_user_question with no options — show custom input directly
    if (isQuestion && questionOptions.length === 0) {
        return (
            <Dialog
                title={questionText || `${pending.toolName}(${summarizeArgs(pending.input)})`}
                subtitle={t('ui.approval.customInputHint')}
                isActive={false}
                onConfirm={() => onSelectOption(customText)}
                onCancel={() => onDeny(t('ui.approval.userCancelled'))}
            >
                <Box>
                    <Text color="suggestion">{'❯ '}</Text>
                    <TextInput value={customText} onChange={setCustomText} onSubmit={(v) => onSelectOption(v || customText)} />
                </Box>
            </Dialog>
        );
    }

    // ask_user_question with option list
    if (isQuestion && questionOptions.length > 0) {
        return (
            <Dialog
                title={questionText || `${pending.toolName}(${summarizeArgs(pending.input)})`}
                subtitle={t('ui.approval.selectConfirm')}
                onConfirm={() => {
                    if (index < questionOptions.length) {
                        onSelectOption(questionOptions[index]!);
                    } else {
                        setCustomInputMode(true);
                    }
                }}
                onCancel={() => onDeny(t('ui.approval.userCancelled'))}
            >
                {allItems.map((label, i) => (
                    <ListItem isFocused={i === index} key={i}>
                        {i < questionOptions.length ? `${i + 1}. ${label}` : label}
                    </ListItem>
                ))}
            </Dialog>
        );
    }

    // Standard approval dialog (not ask_user_question)
    return (
        <Dialog
            title={`${pending.toolName}(${summarizeArgs(pending.input)})`}
            subtitle={t('ui.approval.selectConfirm')}
            onConfirm={() => {
                if (index === 0) onApprove();
                else if (index === 1) onAlwaysApprove();
                else onDeny();
            }}
            onCancel={() => onDeny()}
        >
            {approvalOptions.map((label, i) => (
                <ListItem isFocused={i === index} key={label}>
                    {label}
                </ListItem>
            ))}
        </Dialog>
    );
}
