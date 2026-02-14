import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Text, useInput, useStdout, useStdin } from 'ink';

export interface ScrollBoxProps {
    content: string;
    height?: number;
    width?: number | string;
    borderColor?: string;
    showScrollbar?: boolean;
}

export function ScrollBox({
    content,
    height = 15,
    width = '100%',
    borderColor = 'yellow',
    showScrollbar = true,
}: ScrollBoxProps) {
    const [scrollTop, setScrollTop] = useState(0);
    const { stdout } = useStdout();
    const { stdin, setRawMode } = useStdin();
    const scrollTopRef = useRef(scrollTop);

    // Keep ref in sync with state for use in event handlers
    useEffect(() => {
        scrollTopRef.current = scrollTop;
    }, [scrollTop]);

    const lines = content.split('\n');
    const totalLines = lines.length;

    const safeHeight = Math.max(1, height);
    const maxScroll = Math.max(0, totalLines - safeHeight);
    const maxScrollRef = useRef(maxScroll);

    useEffect(() => {
        maxScrollRef.current = maxScroll;
    }, [maxScroll]);

    // Mouse scroll handler
    const handleMouseScroll = useCallback((direction: 'up' | 'down') => {
        const scrollAmount = 3;
        if (direction === 'up') {
            setScrollTop(prev => Math.max(0, prev - scrollAmount));
        } else {
            setScrollTop(prev => Math.min(maxScrollRef.current, prev + scrollAmount));
        }
    }, []);

    // Enable mouse tracking and listen for mouse events via stdin
    useEffect(() => {
        if (!stdout || !stdin) return;

        // Enable mouse tracking: Button (1000), SGR extended mode (1006)
        stdout.write('\x1b[?1000h\x1b[?1006h');

        const handleData = (data: Buffer) => {
            const str = data.toString('utf8');

            // Check for SGR mouse format: ESC [ < button ; x ; y M or m
            // Button 64 = scroll up, 65 = scroll down
            const sgrMatch = str.match(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/);
            if (sgrMatch) {
                const button = parseInt(sgrMatch[1], 10);
                // Button 64 = wheel up, 65 = wheel down
                if (button === 64) {
                    handleMouseScroll('up');
                } else if (button === 65) {
                    handleMouseScroll('down');
                }
                return;
            }

            // Check for X10/Normal mouse format: ESC [ M Cb Cx Cy
            if (str.startsWith('\x1b[M') && str.length >= 6) {
                const cb = str.charCodeAt(3) - 32;
                // 64 = wheel up, 65 = wheel down
                if (cb === 64) {
                    handleMouseScroll('up');
                } else if (cb === 65) {
                    handleMouseScroll('down');
                }
            }
        };

        stdin.on('data', handleData);

        return () => {
            // Disable mouse tracking
            stdout.write('\x1b[?1000l\x1b[?1006l');
            stdin.off('data', handleData);
        };
    }, [stdout, stdin, handleMouseScroll]);

    // Keyboard navigation
    useInput((input, key) => {
        // Arrow keys
        if (key.upArrow) {
            setScrollTop(prev => Math.max(0, prev - 1));
        }
        if (key.downArrow) {
            setScrollTop(prev => Math.min(maxScroll, prev + 1));
        }
        if (key.pageUp) {
            setScrollTop(prev => Math.max(0, prev - safeHeight));
        }
        if (key.pageDown) {
            setScrollTop(prev => Math.min(maxScroll, prev + safeHeight));
        }

        // Vim-style navigation
        if (input === 'k') {
            setScrollTop(prev => Math.max(0, prev - 1));
        }
        if (input === 'j') {
            setScrollTop(prev => Math.min(maxScroll, prev + 1));
        }
        if (input === 'g') {
            setScrollTop(0); // Go to top
        }
        if (input === 'G') {
            setScrollTop(maxScroll); // Go to bottom
        }
    });

    const currentScrollTop = Math.min(Math.max(0, scrollTop), maxScroll);
    const visibleLines = lines.slice(currentScrollTop, currentScrollTop + safeHeight);

    return (
        <Box
            flexDirection="row"
            width={width}
            borderStyle="round"
            borderColor={borderColor}
            paddingX={1}
        >
            <Box flexDirection="column" flexGrow={1}>
                {visibleLines.map((line, i) => (
                    <Text key={`${currentScrollTop}-${i}`} wrap="wrap">{line || ' '}</Text>
                ))}
                {visibleLines.length === 0 && <Text dimColor>(Empty)</Text>}
            </Box>

            {showScrollbar && totalLines > safeHeight && (
                <Box flexDirection="column" paddingLeft={1} borderStyle="single" borderLeft={true} borderRight={false} borderTop={false} borderBottom={false} borderColor="gray">
                    {/* Scrollbar Indicator */}
                    <Text dimColor>
                        {Math.round((currentScrollTop / maxScroll) * 100)}%
                    </Text>
                </Box>
            )}
        </Box>
    );
}

