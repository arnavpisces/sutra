import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { te } from '../../theme/te.js';

export interface MenuListItem {
  label: string;
  value: string;
}

export interface MenuListProps {
  items: MenuListItem[];
  onSelect: (item: MenuListItem) => void;
  isActive?: boolean;
}

/**
 * Dense menu list with deterministic one-row-per-item spacing.
 * This avoids terminal glyph-width quirks from third-party select components.
 */
export function MenuList({ items, onSelect, isActive = true }: MenuListProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((_input, key) => {
    if (!isActive || items.length === 0) return;

    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex(prev => Math.min(items.length - 1, prev + 1));
      return;
    }
    if (key.return) {
      onSelect(items[selectedIndex]);
    }
  }, { isActive });

  return (
    <Box flexDirection="column">
      {items.map((item, i) => {
        const selected = i === selectedIndex;
        return (
          <Text key={item.value} color={selected ? te.accent : te.fg}>
            {selected ? '❯ ' : '  '}
            {item.label}
          </Text>
        );
      })}
    </Box>
  );
}
