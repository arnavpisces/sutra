import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Text, useInput, useStdin, useStdout } from 'ink';
import { ConfluenceClient, ConfluenceSpace, ConfluencePage } from '../../api/confluence-client.js';
import { PersistentCache } from '../../storage/cache.js';

// Cache for spaces list and pages within spaces (5 minute TTL)
const spacesCache = new PersistentCache<TreeNode[]>('confluence:spaces-list', 300);
const spacesPagesCache = new PersistentCache<TreeNode[]>('confluence:spaces-pages', 300);

interface TreeNode {
    id: string;
    label: string;
    type: 'space' | 'page';
    isExpanded?: boolean;
    children?: TreeNode[];
    spaceKey?: string;
    pageId?: string;
}

export interface SpaceTreeProps {
    client: ConfluenceClient;
    onSelectPage: (pageId: string) => void;
    activePageId?: string;
    width?: number;
    isActive?: boolean;
}

export function SpaceTree({ client, onSelectPage, activePageId, width = 30, isActive = true }: SpaceTreeProps) {
    const [nodes, setNodes] = useState<TreeNode[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const { stdin } = useStdin();
    const { stdout } = useStdout();

    // Flatten visible nodes for keyboard navigation
    const visibleNodes = useMemo(() => {
        const flattened: TreeNode[] = [];
        const walk = (nodeList: TreeNode[]) => {
            nodeList.forEach(node => {
                flattened.push(node);
                if (node.isExpanded && node.children) {
                    walk(node.children);
                }
            });
        };
        walk(nodes);
        return flattened;
    }, [nodes]);

    // Initial load of spaces
    useEffect(() => {
        const loadSpaces = async () => {
            // Check cache first
            const cached = spacesCache.get('spaces-list');
            if (cached) {
                setNodes(cached);
                setLoading(false);
                return;
            }

            try {
                const spaceResult = await client.getSpaces();
                const initialNodes: TreeNode[] = spaceResult.results.map(space => ({
                    id: `space-${space.key}`,
                    label: space.name,
                    type: 'space',
                    isExpanded: false,
                    children: [],
                    spaceKey: space.key,
                }));
                setNodes(initialNodes);
                spacesCache.set('spaces-list', initialNodes);
            } catch (error) {
                console.error('Failed to load spaces', error);
            } finally {
                setLoading(false);
            }
        };
        loadSpaces();
    }, [client]);

    const toggleNode = useCallback(async (index: number) => {
        const node = visibleNodes[index];
        if (!node || node.type !== 'space') return;

        // Find the node in the nested structure and toggle it
        const updateNodes = (list: TreeNode[]): TreeNode[] => {
            return list.map(n => {
                if (n.id === node.id) {
                    const nextExpanded = !n.isExpanded;
                    // If expanding and no children, fetch pages
                    if (nextExpanded && n.children?.length === 0) {
                        fetchPages(n);
                    }
                    return { ...n, isExpanded: nextExpanded };
                }
                if (n.children) {
                    return { ...n, children: updateNodes(n.children) };
                }
                return n;
            });
        };

        const fetchPages = async (spaceNode: TreeNode) => {
            // Check cache for this space's pages
            const cacheKey = `space-pages-${spaceNode.spaceKey}`;
            const cachedPages = spacesPagesCache.get(cacheKey);
            if (cachedPages) {
                setNodes(prev => {
                    const updateWithPages = (list: TreeNode[]): TreeNode[] => {
                        return list.map(n => {
                            if (n.id === spaceNode.id) {
                                return { ...n, children: cachedPages };
                            }
                            if (n.children) {
                                return { ...n, children: updateWithPages(n.children) };
                            }
                            return n;
                        });
                    };
                    return updateWithPages(prev);
                });
                return;
            }

            try {
                const pageResult = await client.getPagesInSpace(spaceNode.spaceKey!);
                const pageNodes: TreeNode[] = pageResult.results.map(res => {
                    const content = res.content || res;
                    return {
                        id: `page-${content.id}`,
                        label: content.title || 'Untitled',
                        type: 'page',
                        pageId: content.id,
                    };
                });

                // Cache the pages
                spacesPagesCache.set(cacheKey, pageNodes);

                setNodes(prev => {
                    const updateWithPages = (list: TreeNode[]): TreeNode[] => {
                        return list.map(n => {
                            if (n.id === spaceNode.id) {
                                return { ...n, children: pageNodes };
                            }
                            if (n.children) {
                                return { ...n, children: updateWithPages(n.children) };
                            }
                            return n;
                        });
                    };
                    return updateWithPages(prev);
                });
            } catch (err) {
                console.error('Failed to fetch pages', err);
            }
        };

        setNodes(prev => updateNodes(prev));
    }, [visibleNodes, client]);

    const handleSelect = useCallback((index: number) => {
        const node = visibleNodes[index];
        if (!node) return;

        if (node.type === 'page' && node.pageId) {
            onSelectPage(node.pageId);
        } else if (node.type === 'space') {
            toggleNode(index);
        }
    }, [visibleNodes, onSelectPage, toggleNode]);

    useInput((input, key) => {
        if (!isActive) return;
        if (key.upArrow) {
            setSelectedIndex(prev => Math.max(0, prev - 1));
        } else if (key.downArrow) {
            setSelectedIndex(prev => Math.min(visibleNodes.length - 1, prev + 1));
        } else if (key.return) {
            handleSelect(selectedIndex);
        } else if (key.rightArrow) {
            const node = visibleNodes[selectedIndex];
            if (node?.type === 'space' && !node.isExpanded) {
                toggleNode(selectedIndex);
            }
        } else if (key.leftArrow) {
            const node = visibleNodes[selectedIndex];
            if (node?.type === 'space' && node.isExpanded) {
                toggleNode(selectedIndex);
            }
        }
    });

    // Mouse support
    useEffect(() => {
        if (!stdout || !stdin) return;

        // Ensure mouse tracking is on
        stdout.write('\x1b[?1000h\x1b[?1006h');

        const onData = (data: Buffer) => {
            const str = data.toString();
            const sgrMatch = str.match(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/);
            if (sgrMatch) {
                const button = parseInt(sgrMatch[1], 10);
                const x = parseInt(sgrMatch[2], 10);
                const y = parseInt(sgrMatch[3], 10);
                const isPress = sgrMatch[4] === 'M';

                if (button === 0 && isPress) {
                    // Left click
                    // Account for Header (2) and Title (2) = 4
                    const localY = y - 4;
                    if (localY >= 0 && localY < visibleNodes.length) {
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
    }, [stdin, stdout, visibleNodes, handleSelect]);

    if (loading) {
        return (
            <Box width={width} borderStyle="round" borderColor="gray" paddingX={1}>
                <Text color="gray">Loading spaces...</Text>
            </Box>
        );
    }

    return (
        <Box width={width} flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
            <Box marginBottom={1}>
                <Text bold underline>Confluence Spaces</Text>
            </Box>

            {visibleNodes.map((node, i) => {
                const isSelected = i === selectedIndex;
                const isActive = node.type === 'page' && node.pageId === activePageId;

                let icon = '  ';
                if (node.type === 'space') {
                    icon = node.isExpanded ? '▼ ' : '▶ ';
                } else {
                    icon = '  📄 ';
                }

                // Indentation
                const indent = node.type === 'page' ? '  ' : '';

                return (
                    <Box key={node.id}>
                        <Text
                            backgroundColor={isSelected ? 'white' : undefined}
                            color={isSelected ? 'black' : (isActive ? 'cyan' : undefined)}
                        >
                            {indent}{icon}{node.label}
                        </Text>
                    </Box>
                );
            })}
        </Box>
    );
}

