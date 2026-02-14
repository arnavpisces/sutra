import React from 'react';
import { Box, Text } from 'ink';
import { te } from '../../theme/te.js';

export interface SelectableItemProps {
    label: string;
    content?: React.ReactNode;
    isSelected: boolean;
    actionLabel?: string; // e.g., "[EDIT]" or "[ENTER]"
    compact?: boolean; // For single-line items like "Add Comment"
}

/**
 * A selectable item component with video game-style highlight.
 * Selected row gets a border; non-selected rows stay compact to reduce vertical noise.
 */
export function SelectableItem({
    label,
    content,
    isSelected,
    actionLabel,
    compact = false,
}: SelectableItemProps) {
    if (isSelected) {
        return (
            <Box
                flexDirection="column"
                borderStyle="single"
                borderColor={te.accent}
                paddingX={1}
                marginY={0}
            >
                <Box justifyContent="space-between" width="100%">
                    <Text bold>
                        <Text color={te.accentAlt}>▶ </Text>
                        <Text color={te.fg}>{label}</Text>
                    </Text>
                    {actionLabel && (
                        <Text backgroundColor={te.accentAlt} color="black" bold>
                            {' '}{actionLabel}{' '}
                        </Text>
                    )}
                </Box>
                {content && (
                    <Box paddingLeft={2}>
                        {typeof content === 'string' ? (
                            <Text color={te.fg}>{content}</Text>
                        ) : (
                            content
                        )}
                    </Box>
                )}
            </Box>
        );
    }

    return (
        <Box
            flexDirection="column"
            paddingX={1}
            marginY={0}
        >
            <Box justifyContent="space-between" width="100%">
                <Text color={te.muted}>
                    {'  '}{label}
                </Text>
                {actionLabel && (
                    <Text color={te.muted}>
                        {actionLabel}
                    </Text>
                )}
            </Box>
            {content && (
                <Box paddingLeft={2}>
                    {typeof content === 'string' ? <Text color={te.muted}>{content}</Text> : content}
                </Box>
            )}
        </Box>
    );
}
