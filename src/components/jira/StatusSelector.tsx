import React, { useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { JiraTransition } from '../../api/jira-client.js';

export interface StatusSelectorProps {
  transitions: JiraTransition[];
  currentStatus: string;
  onSelect: (transitionId: string) => void;
  onCancel: () => void;
}

export function StatusSelector({
  transitions,
  currentStatus,
  onSelect,
  onCancel,
}: StatusSelectorProps) {
  const items = transitions.map((transition) => ({
    label: `${transition.name} → ${transition.to.name}`,
    value: transition.id,
  }));

  return (
    <Box flexDirection="column" width="100%">
      <Text>Current Status: {currentStatus}</Text>
      <Box marginBottom={1}>
        <Text>Select new status:</Text>
      </Box>

      {items.length > 0 ? (
        <SelectInput
          items={items}
          onSelect={(item: any) => onSelect(item.value)}
        />
      ) : (
        <Text color="yellow">No status transitions available</Text>
      )}

      <Box marginTop={1}>
        <Text dimColor>
          q: cancel
        </Text>
      </Box>
    </Box>
  );
}
