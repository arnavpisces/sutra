import MarkdownIt from 'markdown-it';
import Token from 'markdown-it/lib/token.mjs';
import chalk from 'chalk';

/**
 * Renders Markdown to ANSI-styled text for terminal display.
 * Uses markdown-it for parsing and chalk for styling.
 */
export class MarkdownAnsiRenderer {
    private md: MarkdownIt;

    constructor() {
        this.md = new MarkdownIt({
            html: false,
            breaks: true,
            linkify: true,
        });
    }

    /**
     * Render markdown string to ANSI-styled terminal text
     */
    render(markdown: string): string {
        const tokens = this.md.parse(markdown, {});
        return this.renderTokens(tokens);
    }

    private renderTokens(tokens: Token[]): string {
        let output = '';
        let listDepth = 0;
        let orderedListIndex = 0;

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];

            switch (token.type) {
                // Headings
                case 'heading_open':
                    const level = parseInt(token.tag.slice(1));
                    const headingContent = tokens[i + 1]?.content || '';
                    output += this.renderHeading(headingContent, level);
                    i += 2; // Skip heading_content and heading_close
                    break;

                // Paragraphs
                case 'paragraph_open':
                    break;
                case 'paragraph_close':
                    output += '\n';
                    break;

                // Inline content
                case 'inline':
                    output += this.renderInline(token.children || []);
                    break;

                // Code blocks
                case 'fence':
                case 'code_block':
                    output += this.renderCodeBlock(token.content, token.info);
                    break;

                // Lists
                case 'bullet_list_open':
                    listDepth++;
                    break;
                case 'bullet_list_close':
                    listDepth--;
                    output += '\n';
                    break;
                case 'ordered_list_open':
                    listDepth++;
                    orderedListIndex = 1;
                    break;
                case 'ordered_list_close':
                    listDepth--;
                    orderedListIndex = 0;
                    output += '\n';
                    break;
                case 'list_item_open':
                    const indent = '  '.repeat(listDepth - 1);
                    const bullet = orderedListIndex > 0
                        ? chalk.yellow(`${orderedListIndex++}.`)
                        : chalk.yellow('•');
                    output += `${indent}${bullet} `;
                    break;
                case 'list_item_close':
                    break;

                // Blockquotes
                case 'blockquote_open':
                    break;
                case 'blockquote_close':
                    output += '\n';
                    break;

                // Horizontal rule
                case 'hr':
                    output += chalk.gray('─'.repeat(60)) + '\n\n';
                    break;

                // Tables
                case 'table_open':
                    output += '\n';
                    break;
                case 'table_close':
                    output += '\n';
                    break;
                case 'thead_open':
                case 'thead_close':
                case 'tbody_open':
                case 'tbody_close':
                case 'tr_open':
                    break;
                case 'tr_close':
                    output += '\n';
                    break;
                case 'th_open':
                    output += chalk.bold.underline('');
                    break;
                case 'th_close':
                    output += ' │ ';
                    break;
                case 'td_open':
                    break;
                case 'td_close':
                    output += ' │ ';
                    break;

                // HTML (images, etc)
                case 'html_block':
                case 'html_inline':
                    output += this.handleHtml(token.content);
                    break;

                default:
                    // Ignore unknown tokens
                    break;
            }
        }

        return output.trim();
    }

    private renderHeading(content: string, level: number): string {
        const prefix = chalk.yellow('#'.repeat(level));
        const styled = level === 1
            ? chalk.bold.underline.white(content)
            : level === 2
                ? chalk.bold.white(content)
                : chalk.bold.gray(content);
        return `\n${prefix} ${styled}\n\n`;
    }

    private renderInline(tokens: Token[]): string {
        let output = '';
        let currentLink: string | null = null;

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];

            switch (token.type) {
                case 'text':
                    if (currentLink) {
                        // OSC 8 hyperlink format: \x1b]8;;URL\x07TEXT\x1b]8;;\x07
                        output += this.makeClickableLink(currentLink, token.content);
                    } else {
                        output += token.content;
                    }
                    break;
                case 'strong_open':
                    // Find the text between open and close
                    let boldText = '';
                    for (let j = i + 1; j < tokens.length && tokens[j].type !== 'strong_close'; j++) {
                        if (tokens[j].content) boldText += tokens[j].content;
                    }
                    output += chalk.bold(boldText);
                    // Skip to close
                    while (i < tokens.length && tokens[i].type !== 'strong_close') i++;
                    break;
                case 'em_open':
                    let italicText = '';
                    for (let j = i + 1; j < tokens.length && tokens[j].type !== 'em_close'; j++) {
                        if (tokens[j].content) italicText += tokens[j].content;
                    }
                    output += chalk.italic(italicText);
                    while (i < tokens.length && tokens[i].type !== 'em_close') i++;
                    break;
                case 'code_inline':
                    output += chalk.bgGray.white(` ${token.content} `);
                    break;
                case 'link_open':
                    currentLink = token.attrGet('href') || '';
                    break;
                case 'link_close':
                    currentLink = null;
                    break;
                case 'image':
                    const src = token.attrGet('src') || 'unknown';
                    const alt = token.attrGet('alt') || token.content || 'image';
                    // Make image link clickable
                    output += this.makeClickableLink(src, chalk.cyan(`[📷 ${alt}]`));
                    break;
                case 'softbreak':
                    output += '\n';
                    break;
                case 'hardbreak':
                    output += '\n';
                    break;
                default:
                    if (token.content && !['strong_close', 'em_close'].includes(token.type)) {
                        output += token.content;
                    }
                    break;
            }
        }

        return output;
    }

    /**
     * Creates a clickable hyperlink using OSC 8 escape sequence.
     * Supported by: iTerm2, Kitty, Alacritty, Hyper, VS Code terminal, and more.
     */
    private makeClickableLink(url: string, text: string): string {
        // OSC 8 format: \x1b]8;;URL\x1b\\TEXT\x1b]8;;\x1b\\
        // Using \x07 (BEL) as terminator for wider compatibility
        return `\x1b]8;;${url}\x07${chalk.blue.underline(text)}\x1b]8;;\x07`;
    }

    private renderCodeBlock(content: string, language?: string): string {
        const header = language
            ? chalk.bgGray.white(` ${language} `)
            : chalk.bgGray.white(' code ');
        const border = chalk.gray('┌' + '─'.repeat(58) + '┐');
        const borderBottom = chalk.gray('└' + '─'.repeat(58) + '┘');

        const lines = content.trim().split('\n').map(line => {
            const padded = line.padEnd(56).slice(0, 56);
            return chalk.gray('│ ') + chalk.green(padded) + chalk.gray(' │');
        });

        return `\n${header}\n${border}\n${lines.join('\n')}\n${borderBottom}\n\n`;
    }

    private handleHtml(html: string): string {
        // Extract images from HTML
        const imgMatch = html.match(/<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/i);
        if (imgMatch) {
            return chalk.cyan(`[📷 ${imgMatch[2] || 'image'}] `) + chalk.dim(`(${imgMatch[1]})\n`);
        }

        // Handle <br> tags
        if (html.match(/<br\s*\/?>/i)) {
            return '\n';
        }

        // Strip other HTML and show as text
        const stripped = html.replace(/<[^>]+>/g, '').trim();
        return stripped ? chalk.dim(stripped) + '\n' : '';
    }
}

// Singleton instance for convenience
export const markdownRenderer = new MarkdownAnsiRenderer();
