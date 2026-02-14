import React from 'react';
import { Text } from 'ink';

/**
 * Markdown syntax highlighter for terminal display
 * Inspired by md-tui's approach: parse markdown elements and apply terminal colors
 */

// Color configuration (like md-tui's config.toml)
export const MarkdownColors = {
    // Headings by level
    h1: 'cyanBright',
    h2: 'cyan',
    h3: 'blue',
    h4: 'green',
    h5: 'yellow',
    h6: 'magenta',
    
    // Inline elements
    bold: 'white',
    italic: 'cyan',
    boldItalic: 'cyan',
    code: 'yellow',
    codeBg: 'gray',
    strikethrough: 'gray',
    
    // Links and references
    link: 'blueBright',
    linkBrackets: 'gray',
    
    // Lists
    listMarker: 'cyan',
    taskDone: 'green',
    taskPending: 'yellow',
    
    // Quotes and special blocks
    quote: 'gray',
    quoteTip: 'green',
    quoteWarning: 'yellow',
    quoteCaution: 'magenta',
    quoteImportant: 'red',
    quoteNote: 'blue',
    
    // Code blocks
    codeBlockBorder: 'gray',
    codeBlockLang: 'cyan',
    
    // Horizontal rule
    horizontalRule: 'gray',
} as const;

interface TextSegment {
    text: string;
    color?: string;
    bgColor?: string;
    bold?: boolean;
    italic?: boolean;
    dimmed?: boolean;
    strikethrough?: boolean;
}

/**
 * Parse and highlight a single line of markdown
 * Returns an array of styled Text components
 */
export function highlightMarkdownLine(line: string, lineIndex: number): React.ReactNode {
    const segments: TextSegment[] = [];
    
    // Check for block-level elements first
    
    // Heading detection: # ## ### etc.
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
        const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6;
        const headingColors: Record<number, string> = {
            1: MarkdownColors.h1,
            2: MarkdownColors.h2,
            3: MarkdownColors.h3,
            4: MarkdownColors.h4,
            5: MarkdownColors.h5,
            6: MarkdownColors.h6,
        };
        return (
            <Text bold color={headingColors[level]}>
                {line}
            </Text>
        );
    }
    
    // Horizontal rule: --- or *** or ___
    if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(line)) {
        return <Text color={MarkdownColors.horizontalRule}>{line}</Text>;
    }
    
    // Quote block: > text or special quotes [!tip] etc.
    const quoteMatch = line.match(/^(\s*>\s*)(.*)$/);
    if (quoteMatch) {
        const prefix = quoteMatch[1];
        const content = quoteMatch[2];
        
        // Check for special quote types
        let quoteColor: string = MarkdownColors.quote;
        if (content.startsWith('[!tip]')) quoteColor = MarkdownColors.quoteTip;
        else if (content.startsWith('[!warning]')) quoteColor = MarkdownColors.quoteWarning;
        else if (content.startsWith('[!caution]')) quoteColor = MarkdownColors.quoteCaution;
        else if (content.startsWith('[!important]')) quoteColor = MarkdownColors.quoteImportant;
        else if (content.startsWith('[!note]')) quoteColor = MarkdownColors.quoteNote;
        
        return (
            <>
                <Text color={quoteColor} bold>│ </Text>
                <Text color={quoteColor} italic>{content}</Text>
            </>
        );
    }
    
    // List items: - or * or + or numbered 1.
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (listMatch) {
        const indent = listMatch[1];
        const marker = listMatch[2];
        const content = listMatch[3];
        
        // Check for task list: - [ ] or - [x]
        const taskMatch = content.match(/^\[([ xX])\]\s*(.*)$/);
        if (taskMatch) {
            const isDone = taskMatch[1].toLowerCase() === 'x';
            const taskContent = taskMatch[2];
            return (
                <>
                    <Text>{indent}</Text>
                    <Text color={MarkdownColors.listMarker}>{marker} </Text>
                    <Text color={isDone ? MarkdownColors.taskDone : MarkdownColors.taskPending}>
                        [{isDone ? '✓' : ' '}]
                    </Text>
                    <Text> </Text>
                    {highlightInlineMarkdown(taskContent)}
                </>
            );
        }
        
        return (
            <>
                <Text>{indent}</Text>
                <Text color={MarkdownColors.listMarker}>{marker} </Text>
                {highlightInlineMarkdown(content)}
            </>
        );
    }
    
    // Code block fence: ```language
    const codeFenceMatch = line.match(/^(`{3,})([\w]*)$/);
    if (codeFenceMatch) {
        const fence = codeFenceMatch[1];
        const lang = codeFenceMatch[2];
        return (
            <>
                <Text color={MarkdownColors.codeBlockBorder}>{fence}</Text>
                {lang && <Text color={MarkdownColors.codeBlockLang}>{lang}</Text>}
            </>
        );
    }
    
    // Regular line - highlight inline elements
    return highlightInlineMarkdown(line);
}

/**
 * Highlight inline markdown elements: bold, italic, code, links, etc.
 */
function highlightInlineMarkdown(text: string): React.ReactNode {
    if (!text) return <Text> </Text>;
    
    const segments: React.ReactNode[] = [];
    let remaining = text;
    let keyIndex = 0;
    
    // Patterns in order of precedence (most specific first)
    const patterns: Array<{
        regex: RegExp;
        render: (match: RegExpMatchArray, key: number) => React.ReactNode;
    }> = [
        // Inline code: `code`
        {
            regex: /`([^`]+)`/,
            render: (match, key) => (
                <Text key={key} color={MarkdownColors.code} backgroundColor={MarkdownColors.codeBg}>
                    {match[0]}
                </Text>
            ),
        },
        // Bold + Italic: ***text*** or ___text___
        {
            regex: /(\*{3}|_{3})([^*_]+)\1/,
            render: (match, key) => (
                <Text key={key} color={MarkdownColors.boldItalic} bold italic>
                    {match[0]}
                </Text>
            ),
        },
        // Bold: **text** or __text__
        {
            regex: /(\*{2}|_{2})([^*_]+)\1/,
            render: (match, key) => (
                <Text key={key} color={MarkdownColors.bold} bold>
                    {match[0]}
                </Text>
            ),
        },
        // Italic: *text* or _text_
        {
            regex: /(\*|_)([^*_]+)\1/,
            render: (match, key) => (
                <Text key={key} color={MarkdownColors.italic} italic>
                    {match[0]}
                </Text>
            ),
        },
        // Strikethrough: ~~text~~
        {
            regex: /~~([^~]+)~~/,
            render: (match, key) => (
                <Text key={key} color={MarkdownColors.strikethrough} strikethrough>
                    {match[0]}
                </Text>
            ),
        },
        // Links: [text](url)
        {
            regex: /\[([^\]]+)\]\(([^)]+)\)/,
            render: (match, key) => (
                <Text key={key}>
                    <Text color={MarkdownColors.linkBrackets}>[</Text>
                    <Text color={MarkdownColors.link} underline>{match[1]}</Text>
                    <Text color={MarkdownColors.linkBrackets}>](</Text>
                    <Text color={MarkdownColors.link} dimColor>{match[2]}</Text>
                    <Text color={MarkdownColors.linkBrackets}>)</Text>
                </Text>
            ),
        },
        // Image: ![alt](url)
        {
            regex: /!\[([^\]]*)\]\(([^)]+)\)/,
            render: (match, key) => (
                <Text key={key}>
                    <Text color={MarkdownColors.linkBrackets}>![</Text>
                    <Text color={MarkdownColors.link}>{match[1]}</Text>
                    <Text color={MarkdownColors.linkBrackets}>](</Text>
                    <Text color={MarkdownColors.link} dimColor>{match[2]}</Text>
                    <Text color={MarkdownColors.linkBrackets}>)</Text>
                </Text>
            ),
        },
        // Reference links: [text][ref]
        {
            regex: /\[([^\]]+)\]\[([^\]]*)\]/,
            render: (match, key) => (
                <Text key={key}>
                    <Text color={MarkdownColors.linkBrackets}>[</Text>
                    <Text color={MarkdownColors.link} underline>{match[1]}</Text>
                    <Text color={MarkdownColors.linkBrackets}>][</Text>
                    <Text color={MarkdownColors.link} dimColor>{match[2]}</Text>
                    <Text color={MarkdownColors.linkBrackets}>]</Text>
                </Text>
            ),
        },
    ];
    
    while (remaining.length > 0) {
        let earliestMatch: { pattern: typeof patterns[0]; match: RegExpMatchArray; index: number } | null = null;
        
        // Find the earliest matching pattern
        for (const pattern of patterns) {
            const match = remaining.match(pattern.regex);
            if (match && match.index !== undefined) {
                if (!earliestMatch || match.index < earliestMatch.index) {
                    earliestMatch = { pattern, match, index: match.index };
                }
            }
        }
        
        if (earliestMatch) {
            // Add text before the match
            if (earliestMatch.index > 0) {
                segments.push(
                    <Text key={keyIndex++}>{remaining.slice(0, earliestMatch.index)}</Text>
                );
            }
            
            // Add the matched element
            segments.push(earliestMatch.pattern.render(earliestMatch.match, keyIndex++));
            
            // Continue with remaining text
            remaining = remaining.slice(earliestMatch.index + earliestMatch.match[0].length);
        } else {
            // No more matches, add remaining text
            segments.push(<Text key={keyIndex++}>{remaining}</Text>);
            break;
        }
    }
    
    return <>{segments}</>;
}

/**
 * Detect if we're inside a code block based on line context
 * Returns the language if inside a code block, null otherwise
 */
export function detectCodeBlock(lines: string[], currentLine: number): string | null {
    let inCodeBlock = false;
    let language: string | null = null;
    
    for (let i = 0; i <= currentLine; i++) {
        const fenceMatch = lines[i].match(/^`{3,}([\w]*)$/);
        if (fenceMatch) {
            if (!inCodeBlock) {
                inCodeBlock = true;
                language = fenceMatch[1] || 'text';
            } else {
                inCodeBlock = false;
                language = null;
            }
        }
    }
    
    return inCodeBlock ? language : null;
}

/**
 * Apply simple syntax highlighting to code based on language
 * This is a simplified version - md-tui uses tree-sitter for full parsing
 */
export function highlightCodeLine(line: string, language: string): React.ReactNode {
    // Common keywords for various languages
    const keywords: Record<string, string[]> = {
        javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'null', 'undefined', 'true', 'false'],
        typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'null', 'undefined', 'true', 'false', 'interface', 'type', 'enum', 'implements', 'extends', 'public', 'private', 'protected'],
        python: ['def', 'class', 'import', 'from', 'return', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'raise', 'with', 'as', 'lambda', 'True', 'False', 'None', 'and', 'or', 'not', 'in', 'is', 'async', 'await'],
        rust: ['fn', 'let', 'mut', 'const', 'struct', 'enum', 'impl', 'trait', 'pub', 'use', 'mod', 'if', 'else', 'match', 'for', 'while', 'loop', 'return', 'self', 'Self', 'true', 'false', 'async', 'await', 'move', 'ref', 'where'],
        go: ['func', 'var', 'const', 'type', 'struct', 'interface', 'package', 'import', 'if', 'else', 'for', 'range', 'switch', 'case', 'return', 'defer', 'go', 'chan', 'select', 'true', 'false', 'nil'],
        bash: ['if', 'then', 'else', 'fi', 'for', 'do', 'done', 'while', 'case', 'esac', 'function', 'return', 'exit', 'echo', 'export', 'source', 'local', 'readonly'],
        json: [],
        yaml: [],
        html: [],
        css: [],
    };
    
    const langKeywords = keywords[language.toLowerCase()] || keywords['javascript'] || [];
    
    if (langKeywords.length === 0) {
        // No highlighting for this language
        return <Text color="white">{line}</Text>;
    }
    
    const segments: React.ReactNode[] = [];
    let remaining = line;
    let keyIndex = 0;
    
    // Simple tokenizer patterns
    const tokenPatterns: Array<{
        regex: RegExp;
        color: string;
        bold?: boolean;
    }> = [
        // Strings (double quotes)
        { regex: /"(?:[^"\\]|\\.)*"/, color: 'magenta' },
        // Strings (single quotes)
        { regex: /'(?:[^'\\]|\\.)*'/, color: 'magenta' },
        // Template strings
        { regex: /`(?:[^`\\]|\\.)*`/, color: 'magenta' },
        // Comments (// and #)
        { regex: /\/\/.*$|#.*$/, color: 'gray' },
        // Numbers
        { regex: /\b\d+(\.\d+)?\b/, color: 'yellow' },
        // Keywords (built dynamically)
        { regex: new RegExp(`\\b(${langKeywords.join('|')})\\b`), color: 'red', bold: true },
        // Function calls
        { regex: /\b([a-zA-Z_]\w*)\s*\(/, color: 'green' },
    ];
    
    while (remaining.length > 0) {
        let earliestMatch: { pattern: typeof tokenPatterns[0]; match: RegExpMatchArray; index: number } | null = null;
        
        for (const pattern of tokenPatterns) {
            const match = remaining.match(pattern.regex);
            if (match && match.index !== undefined) {
                if (!earliestMatch || match.index < earliestMatch.index) {
                    earliestMatch = { pattern, match, index: match.index };
                }
            }
        }
        
        if (earliestMatch) {
            if (earliestMatch.index > 0) {
                segments.push(
                    <Text key={keyIndex++} color="white">{remaining.slice(0, earliestMatch.index)}</Text>
                );
            }
            
            segments.push(
                <Text 
                    key={keyIndex++} 
                    color={earliestMatch.pattern.color as any}
                    bold={earliestMatch.pattern.bold}
                >
                    {earliestMatch.match[0]}
                </Text>
            );
            
            remaining = remaining.slice(earliestMatch.index + earliestMatch.match[0].length);
        } else {
            segments.push(<Text key={keyIndex++} color="white">{remaining}</Text>);
            break;
        }
    }
    
    return <>{segments}</>;
}
