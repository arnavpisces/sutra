import React, { useState, useEffect } from 'react';
import { Text } from 'ink';
import { te } from '../../theme/te.js';

export interface SpinnerProps {
  type?: 'dots' | 'line' | 'arc' | 'bounce' | 'braille';
  color?: string;
  label?: string;
}

const spinnerFrames = {
  dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  line: ['-', '\\', '|', '/'],
  arc: ['◜', '◠', '◝', '◞', '◡', '◟'],
  bounce: ['⠁', '⠂', '⠄', '⠂'],
  braille: ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'],
};

export function Spinner({ type = 'dots', color = te.accent, label }: SpinnerProps) {
  const [frame, setFrame] = useState(0);
  const frames = spinnerFrames[type];

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % frames.length);
    }, 150);

    return () => clearInterval(timer);
  }, [frames.length]);

  return (
    <Text color={color}>
      {frames[frame]} {label && <Text>{label}</Text>}
    </Text>
  );
}
