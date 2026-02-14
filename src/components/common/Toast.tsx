import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { te } from '../../theme/te.js';

export interface ToastProps {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  onDismiss?: () => void;
}

const icons = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  error: '✗',
};

const colors = {
  info: te.info,
  success: te.success,
  warning: te.warning,
  error: te.danger,
};

export function Toast({
  message,
  type = 'info',
  duration = 3000,
  onDismiss,
}: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  if (!visible) return null;

  return (
    <Box
      borderStyle="single"
      borderColor={colors[type]}
      paddingX={2}
      paddingY={0}
      marginY={0}
    >
      <Text color={colors[type]} bold>
        {icons[type]}{' '}
      </Text>
      <Text color={te.fg}>{message}</Text>
    </Box>
  );
}
