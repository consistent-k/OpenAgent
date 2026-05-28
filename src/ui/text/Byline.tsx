import { Text } from 'ink';
import React, { Children, isValidElement } from 'react';

interface BylineProps {
    children: React.ReactNode;
}

export function Byline({ children }: BylineProps) {
    const validChildren = Children.toArray(children).filter(Boolean);
    if (validChildren.length === 0) return null;

    return (
        <>
            {validChildren.map((child, index) => (
                <React.Fragment key={isValidElement(child) ? ((child.key as string | number | null) ?? index) : index}>
                    {index > 0 && <Text dimColor> · </Text>}
                    {child}
                </React.Fragment>
            ))}
        </>
    );
}
