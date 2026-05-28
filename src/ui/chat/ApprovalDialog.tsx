import { useInput } from 'ink';
import React, { useEffect, useState } from 'react';
import type { PendingToolApproval } from '../../hooks/useChatStream';
import { summarizeArgs } from '../../utils/summarize-args';
import { Dialog } from '../text/Dialog';
import { ListItem } from '../text/ListItem';

const APPROVAL_OPTIONS = ['批准执行', '拒绝'] as const;

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
    onDeny: (reason?: string) => void;
    onSelectOption: (optionText: string) => void;
}

export function ApprovalDialog({ pending, onApprove, onDeny, onSelectOption }: ApprovalDialogProps) {
    const [index, setIndex] = useState(0);

    const isQuestion = isAskUserQuestion(pending);
    const questionOptions = isQuestion ? extractQuestionOptions(pending.input) : [];
    const questionText = isQuestion ? extractQuestionText(pending.input) : '';

    useEffect(() => {
        setIndex(0);
    }, [pending]);

    const maxIndex = isQuestion ? questionOptions.length - 1 : APPROVAL_OPTIONS.length - 1;

    useInput(
        (_input, key) => {
            if (key.upArrow) {
                setIndex((i) => Math.max(0, i - 1));
            } else if (key.downArrow) {
                setIndex((i) => Math.min(maxIndex, i + 1));
            }
        },
        { isActive: true }
    );

    if (isQuestion && questionOptions.length > 0) {
        return (
            <Dialog
                title={questionText || `${pending.toolName}(${summarizeArgs(pending.input)})`}
                subtitle="↑/↓ 选择，Enter 确认"
                onConfirm={() => onSelectOption(questionOptions[index]!)}
                onCancel={() => onDeny('用户未选择')}
            >
                {questionOptions.map((label, i) => (
                    <ListItem isFocused={i === index} key={label}>
                        {label}
                    </ListItem>
                ))}
            </Dialog>
        );
    }

    return (
        <Dialog title={`${pending.toolName}(${summarizeArgs(pending.input)})`} subtitle="↑/↓ 选择，Enter 确认" onConfirm={() => (index === 0 ? onApprove() : onDeny())} onCancel={() => onDeny()}>
            {APPROVAL_OPTIONS.map((label, i) => (
                <ListItem isFocused={i === index} key={label}>
                    {label}
                </ListItem>
            ))}
        </Dialog>
    );
}
