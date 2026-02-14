import React from 'react';
import { Box, Text } from 'ink';
import { te } from '../../theme/te.js';

export interface HelpModalProps {
  visible: boolean;
  sections: Array<{
    title: string;
    shortcuts: Array<{ key: string; description: string }>;
  }>;
  onClose: () => void;
}

export function HelpModal({ visible, sections, onClose }: HelpModalProps) {
  if (!visible) return null;

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={te.accent}
      paddingX={2}
      paddingY={1}
    >
      <Box marginBottom={1} justifyContent="center">
        <Text bold color={te.accentAlt}>
          ⌨️ Keyboard Shortcuts
        </Text>
      </Box>

      {sections.map((section, sIndex) => (
        <Box key={sIndex} flexDirection="column" marginBottom={1}>
          <Text bold color={te.accent} underline>
            {section.title}
          </Text>
          {section.shortcuts.map((shortcut, kIndex) => (
            <Box key={kIndex} marginLeft={2}>
              <Box width={15}>
                <Text backgroundColor={te.accent} color="black">
                  {' '}
                  {shortcut.key}{' '}
                </Text>
              </Box>
              <Text color={te.muted}>{shortcut.description}</Text>
            </Box>
          ))}
        </Box>
      ))}

      <Box marginTop={1} justifyContent="center">
        <Text color={te.muted}>Press </Text>
        <Text backgroundColor={te.accentAlt} color="black">
          {' '}
          ESC{' '}
        </Text>
        <Text color={te.muted}> or </Text>
        <Text backgroundColor={te.accentAlt} color="black">
          {' '}
          ?{' '}
        </Text>
        <Text color={te.muted}> to close</Text>
      </Box>
    </Box>
  );
}
