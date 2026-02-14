import React from 'react';
import { Box } from 'ink';

export interface SplitPaneProps {
  direction?: 'horizontal' | 'vertical';
  children: [React.ReactNode, React.ReactNode];
  ratio?: number;
}

export function SplitPane({
  direction = 'horizontal',
  children,
  ratio = 0.5,
}: SplitPaneProps) {
  const [left, right] = children;

  if (direction === 'horizontal') {
    return (
      <Box flexDirection="row" width="100%" height="100%">
        <Box width={`${Math.round(ratio * 100)}%`}>{left}</Box>
        <Box width={`${Math.round((1 - ratio) * 100)}%`}>{right}</Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width="100%" height="100%">
      <Box height={`${Math.round(ratio * 100)}%`}>{left}</Box>
      <Box height={`${Math.round((1 - ratio) * 100)}%`}>{right}</Box>
    </Box>
  );
}
