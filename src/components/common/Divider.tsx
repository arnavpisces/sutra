import React from 'react';
import { Box, Text } from 'ink';

export interface DividerProps {
  title?: string;
  width?: number;
  color?: string;
}

export function Divider({ title, width = 40, color = 'gray' }: DividerProps) {
  if (!title) {
    return (
      <Box width={width}>
        <Text color={color}>{'─'.repeat(width)}</Text>
      </Box>
    );
  }

  const padding = 2;
  const sideWidth = Math.floor((width - title.length - padding * 2) / 2);
  const leftLine = '─'.repeat(Math.max(0, sideWidth));
  const rightLine = '─'.repeat(Math.max(0, sideWidth));

  return (
    <Box width={width}>
      <Text color={color}>
        {leftLine}
        <Text dimColor>{'─ '}</Text>
        <Text bold color="white">
          {title}
        </Text>
        <Text dimColor>{' ─'}</Text>
        {rightLine}
      </Text>
    </Box>
  );
}
