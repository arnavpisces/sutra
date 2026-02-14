import React from 'react';
import { Box, Text } from 'ink';

export interface StatusBarProps {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  backgroundColor?: string;
}

export function StatusBar({
  left,
  center,
  right,
  backgroundColor = 'blue',
}: StatusBarProps) {
  return (
    <Box
      flexDirection="row"
      width="100%"
      justifyContent="space-between"
      paddingX={1}
      borderStyle="single"
      borderColor={backgroundColor}
    >
      <Box flexGrow={1}>
        <Text color={backgroundColor}>{left}</Text>
      </Box>
      <Box>
        <Text color={backgroundColor} bold>
          {center}
        </Text>
      </Box>
      <Box flexGrow={1} justifyContent="flex-end">
        <Text color={backgroundColor}>{right}</Text>
      </Box>
    </Box>
  );
}
