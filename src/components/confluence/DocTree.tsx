import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Text, useInput, useStdin, useStdout } from 'ink';
import { ConfluenceClient } from '../../api/confluence-client.js';
import { PersistentCache } from '../../storage/cache.js';

interface DocNode {
    id: string;
    label: string;
    pageId: string;
    depth: number;
}

// Cache for docs list (5 minute TTL)
const docsCache = new PersistentCache<DocNode[]>('confluence:docs-list', 300);

export interface DocTreeProps {
    client: ConfluenceClient;
    onSelectPage: (pageId: string) => void;
    activePageId?: string;
    width?: number;
    isActive?: boolean;
}

export function DocTree({ client, onSelectPage, activePageId, width = 30, isActive = true }: DocTreeProps) {
    const [docs, setDocs] = useState<DocNode[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { stdin } = useStdin();
    const { stdout } = useStdout();

    // Load recent docs
    useEffect(() => {
        const loadDocs = async () => {
            // Check cache first
            const cached = docsCache.get('docs-list');
            if (cached) {
                setDocs(cached);
                setLoading(false);
                return;
            }

            try {
                // Search for all pages, ordered by last modified
                const cql = 'type=page ORDER BY lastmodified DESC';
                const result = await client.searchPages(cql, 50);

                const docNodes: DocNode[] = (result.results || []).map((item: any, index: number) => {
                    const content = item.content || item;
                    const spaceName = item.resultGlobalContainer?.title || item.space?.name || '';
                    const title = content.title || item.title || 'Untitled';
                    
                    return {
                        id: `doc-${content.id || item.id}-${index}`,
                        label: spaceName ? `[${spaceName}] ${title}` : title,
                        pageId: content.id || item.id,
                        depth: 0,
                    };
                }).filter((d: DocNode) => d.pageId);

                setDocs(docNodes);
                docsCache.set('docs-list', docNodes);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load docs');
            } finally {
                setLoading(false);
            }
        };
        loadDocs();
    }, [client]);

    const handleSelect = useCallback((index: number) => {
        const doc = docs[index];
        if (doc?.pageId) {
            onSelectPage(doc.pageId);
        }
    }, [docs, onSelectPage]);

    useInput((input, key) => {
        if (!isActive) return;
        if (key.upArrow) {
            setSelectedIndex(prev => Math.max(0, prev - 1));
        } else if (key.downArrow) {
            setSelectedIndex(prev => Math.min(docs.length - 1, prev + 1));
        } else if (key.return) {
            handleSelect(selectedIndex);
        }
    });

    // Mouse support
    useEffect(() => {
        if (!stdout || !stdin || !isActive) return;

        stdout.write('\x1b[?1000h\x1b[?1006h');

        const onData = (data: Buffer) => {
            const str = data.toString();
            const sgrMatch = str.match(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/);
            if (sgrMatch) {
                const button = parseInt(sgrMatch[1], 10);
                const y = parseInt(sgrMatch[3], 10);
                const isPress = sgrMatch[4] === 'M';

                if (button === 0 && isPress) {
                    // Account for border (1) + title (1) + marginBottom (1) = 3
                    const localY = y - 3;
                    if (localY >= 0 && localY < docs.length) {
                        setSelectedIndex(localY);
                        handleSelect(localY);
                    }
                }
            }
        };

        stdin.on('data', onData);
        return () => {
            stdin.removeListener('data', onData);
        };
    }, [stdin, stdout, docs, handleSelect, isActive]);

    // Calculate visible height
    const terminalHeight = stdout?.rows || 24;
    const maxVisibleDocs = Math.max(5, terminalHeight - 6);

    // Scroll to keep selected item visible
    const scrollOffset = useMemo(() => {
        if (selectedIndex < maxVisibleDocs) return 0;
        return Math.min(selectedIndex - maxVisibleDocs + 1, docs.length - maxVisibleDocs);
    }, [selectedIndex, maxVisibleDocs, docs.length]);

    const visibleDocs = docs.slice(scrollOffset, scrollOffset + maxVisibleDocs);

    if (loading) {
        return (
            <Box width={width} borderStyle="round" borderColor="gray" paddingX={1} flexDirection="column">
                <Text color="gray">Loading docs...</Text>
            </Box>
        );
    }

    if (error) {
        return (
            <Box width={width} borderStyle="round" borderColor="red" paddingX={1} flexDirection="column">
                <Text color="red">Error: {error}</Text>
            </Box>
        );
    }

    return (
        <Box width={width} flexDirection="column" borderStyle="round" borderColor={isActive ? 'cyan' : 'gray'} paddingX={1}>
            <Box marginBottom={1}>
                <Text bold color="cyan">📚 Documents ({docs.length})</Text>
            </Box>

            {visibleDocs.length === 0 ? (
                <Text dimColor>No documents found</Text>
            ) : (
                visibleDocs.map((doc, i) => {
                    const actualIndex = scrollOffset + i;
                    const isSelected = actualIndex === selectedIndex;
                    const isActivePage = doc.pageId === activePageId;

                    // Truncate label to fit width
                    const maxLabelWidth = width - 6; // border + padding + icon
                    const truncatedLabel = doc.label.length > maxLabelWidth 
                        ? doc.label.slice(0, maxLabelWidth - 1) + '…' 
                        : doc.label;

                    return (
                        <Box key={doc.id} height={1}>
                            <Text
                                backgroundColor={isSelected ? 'white' : undefined}
                                color={isSelected ? 'black' : (isActivePage ? 'cyan' : undefined)}
                            >
                                {'  '}📄 {truncatedLabel}
                            </Text>
                        </Box>
                    );
                })
            )}

            {docs.length > maxVisibleDocs && (
                <Box marginTop={1}>
                    <Text dimColor>
                        {scrollOffset > 0 ? '↑ ' : '  '}
                        {scrollOffset + maxVisibleDocs < docs.length ? ' ↓' : ''}
                    </Text>
                </Box>
            )}
        </Box>
    );
}
