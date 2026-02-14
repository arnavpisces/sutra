import React from 'react';
import { Box, Text } from 'ink';

export interface ProgressBarProps {
  value: number;
  total: number;
  width?: number;
  showPercent?: boolean;
  showCount?: boolean;
  color?: string;
  label?: string;
}

export function ProgressBar({
  value,
  total,
  width = 20,
  showPercent = true,
  showCount = false,
  color = 'green',
  label,
}: ProgressBarProps) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  const filled = Math.round((value / total) * width);
  const empty = width - filled;

  const filledChar = '█';
  const emptyChar = '░';

  return (
    <Box flexDirection="row" gap={1}>
      {label && <Text dimColor>{label}</Text>}
      <Text color={color}>
        {filledChar.repeat(filled)}
        <Text dimColor>{emptyChar.repeat(empty)}</Text>
      </Text>
      {showPercent && <Text dimColor>{percent}%</Text>}
      {showCount && (
        <Text dimColor>
          ({value}/{total})
        </Text>
      )}
    </Box>
  );
}
