import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isActive?: boolean;
  resultCount?: number;
  icon?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Type to search...',
  isActive = true,
  resultCount,
  icon = '🔍',
}: SearchBarProps) {
  return (
    <Box
      flexDirection="row"
      borderStyle={isActive ? 'round' : 'single'}
      borderColor={isActive ? 'cyan' : 'gray'}
      paddingX={1}
      gap={1}
    >
      <Text color={isActive ? 'cyan' : 'gray'}>{icon}</Text>
      {isActive ? (
        <TextInput
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
      ) : (
        <Text dimColor>{value || placeholder}</Text>
      )}
      {resultCount !== undefined && (
        <Box marginLeft={1}>
          <Text dimColor>({resultCount} results)</Text>
        </Box>
      )}
    </Box>
  );
}
