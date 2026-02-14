import React from 'react';
import { Box, Text } from 'ink';

export interface BreadcrumbsProps {
  items: string[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <Box flexDirection="row" paddingX={1} marginBottom={1}>
      <Text dimColor>📍 </Text>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <Text color={index === items.length - 1 ? 'white' : 'gray'} bold={index === items.length - 1}>
            {item}
          </Text>
          {index < items.length - 1 && <Text dimColor> › </Text>}
        </React.Fragment>
      ))}
    </Box>
  );
}
