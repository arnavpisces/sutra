import React from 'react';
import { Box, Text } from 'ink';
import { te } from '../../theme/te.js';

export interface TabBarProps {
  tabs: string[];
  activeTab: number;
  icons?: string[];
  rightHint?: React.ReactNode;
}

const defaultIcons = ['🎫', '📄', '⚙️'];

export function TabBar({ tabs, activeTab, icons = defaultIcons, rightHint }: TabBarProps) {
  return (
    <Box flexDirection="row" width="100%" justifyContent="space-between">
      <Box flexDirection="row">
        {tabs.map((tab, index) => {
          const isActive = index === activeTab;
          const icon = icons[index] || '';

          return (
            <Box key={index} marginRight={2}>
              {isActive ? (
                <Text bold backgroundColor={te.accent} color="black">
                  {' '}{icon} {tab.toUpperCase()}{' '}
                </Text>
              ) : (
                <Text color={te.fg}>
                  {icon} {tab.toUpperCase()}
                </Text>
              )}
            </Box>
          );
        })}
      </Box>
      {rightHint && (
        <Box>
          <Text color={te.muted}>[</Text>
          <Text color={te.accentAlt}>TAB</Text>
          <Text color={te.muted}>]</Text>
          <Text color={te.muted}> switch mode</Text>
        </Box>
      )}
    </Box>
  );
}
