import React from 'react';
import { Box, Text } from 'ink';
import { te } from '../../theme/te.js';

export interface FooterProps {
  shortcuts: Array<{ key: string; description: string }>;
  mode?: string;
}

export function Footer({ shortcuts, mode }: FooterProps) {
  return (
    <Box flexDirection="row" width="100%" justifyContent="space-between">
      <Box flexDirection="row">
        {shortcuts.map(({ key, description }, index) => (
          <Box key={index} marginRight={2}>
            <Text backgroundColor={te.info} color="black"> {key} </Text>
            <Text color={te.muted}> {description}</Text>
          </Box>
        ))}
      </Box>

      {mode && (
        <Box>
          <Text backgroundColor={te.accent} color="black" bold>
            {' '}{mode}{' '}
          </Text>
        </Box>
      )}
    </Box>
  );
}
