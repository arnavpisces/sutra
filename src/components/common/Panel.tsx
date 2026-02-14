import React from 'react';
import { Box, Text } from 'ink';

export interface PanelProps {
  title: string;
  children: React.ReactNode;
  focused?: boolean;
  icon?: string;
  badge?: string | number;
  width?: number | string;
  height?: number | string;
}

export function Panel({
  title,
  children,
  focused = false,
  icon,
  badge,
  width,
  height,
}: PanelProps) {
  return (
    <Box
      flexDirection="column"
      borderStyle={focused ? 'double' : 'single'}
      borderColor={focused ? 'cyan' : 'gray'}
      width={width}
      height={height}
    >
      <Box flexDirection="row" justifyContent="space-between" paddingX={1}>
        <Box>
          {icon && <Text>{icon} </Text>}
          <Text bold color={focused ? 'cyan' : 'white'} inverse={focused}>
            {' '}
            {title}{' '}
          </Text>
        </Box>
        {badge !== undefined && (
          <Text color="yellow" bold>
            ({badge})
          </Text>
        )}
      </Box>
      <Box flexDirection="column" paddingX={1} paddingY={0}>
        {children}
      </Box>
    </Box>
  );
}
