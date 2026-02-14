import { markdownToAdf } from 'marklassian';
import { convertADFToMarkdown } from 'adf-to-markdown';

export class AdfConverter {
  /**
   * Convert Markdown to ADF (Atlassian Document Format)
   * Used for sending content to Jira (descriptions, comments)
   */
  static markdownToAdf(markdown: string): any {
    try {
      return markdownToAdf(markdown);
    } catch (error) {
      // Fallback to plain text if markdown conversion fails
      return this.plainTextToAdf(markdown);
    }
  }

  /**
   * Convert ADF to Markdown
   * Used for displaying Jira content in the terminal
   */
  static adfToMarkdown(adf: any): string {
    try {
      if (!adf) return '';
      return convertADFToMarkdown(adf);
    } catch (error) {
      // Fallback to plain text extraction
      return this.extractPlainText(adf);
    }
  }

  /**
   * Convert plain text to ADF format
   */
  private static plainTextToAdf(text: string): any {
    return {
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: text,
            },
          ],
        },
      ],
    };
  }

  /**
   * Extract plain text from ADF
   */
  private static extractPlainText(adf: any): string {
    if (!adf) return '';

    const textParts: string[] = [];

    const traverse = (node: any) => {
      if (!node) return;

      if (node.type === 'text' && node.text) {
        textParts.push(node.text);
      }

      if (node.content && Array.isArray(node.content)) {
        node.content.forEach(traverse);
      }
    };

    traverse(adf);
    return textParts.join('');
  }
}
