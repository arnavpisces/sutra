import React from 'react';
import { Box, Text } from 'ink';

export interface KeyHintProps {
  keyName: string;
  label: string;
  color?: string;
}

export function KeyHint({ keyName, label, color = 'gray' }: KeyHintProps) {
  return (
    <Box>
      <Text backgroundColor={color} color="black" bold>
        {' '}
        {keyName}{' '}
      </Text>
      <Text dimColor> {label}</Text>
    </Box>
  );
}

export interface KeyHintGroupProps {
  hints: Array<{ key: string; label: string }>;
  separator?: string;
}

export function KeyHintGroup({ hints, separator = '  ' }: KeyHintGroupProps) {
  return (
    <Box flexDirection="row">
      {hints.map((hint, index) => (
        <React.Fragment key={index}>
          <KeyHint keyName={hint.key} label={hint.label} />
          {index < hints.length - 1 && <Text dimColor>{separator}</Text>}
        </React.Fragment>
      ))}
    </Box>
  );
}
