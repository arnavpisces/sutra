import React from 'react';
import { Text } from 'ink';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'priority';
}

const variantStyles: Record<string, { bg: string; fg: string }> = {
  default: { bg: 'gray', fg: 'white' },
  success: { bg: 'green', fg: 'black' },
  warning: { bg: 'yellow', fg: 'black' },
  error: { bg: 'red', fg: 'white' },
  info: { bg: 'blue', fg: 'white' },
  priority: { bg: 'magenta', fg: 'white' },
};

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const style = variantStyles[variant];

  return (
    <Text backgroundColor={style.bg} color={style.fg}>
      {' '}
      {children}{' '}
    </Text>
  );
}
