import TurndownService from 'turndown';
import MarkdownIt from 'markdown-it';

const turndownService = new TurndownService();
const markdownIt = new MarkdownIt();

export class ConfluenceConverter {
  /**
   * Convert Confluence storage format (XHTML) to Markdown
   * Storage format is XHTML-based, we need to convert it to markdown
   */
  static storageToMarkdown(storage: string): string {
    try {
      if (!storage) return '';

      // Convert XHTML storage to markdown using turndown
      const markdown = turndownService.turndown(storage);
      return markdown.trim();
    } catch (error) {
      // Fallback: try to extract plain text
      return this.extractPlainText(storage);
    }
  }

  /**
   * Convert Markdown to Confluence storage format
   * Storage format is XHTML-based
   */
  static markdownToStorage(markdown: string): string {
    try {
      if (!markdown) return '';

      // Convert markdown to HTML using markdown-it
      const html = markdownIt.render(markdown);

      // Wrap in storage format (required by Confluence API)
      return this.wrapInStorageFormat(html);
    } catch (error) {
      // Fallback to plain text wrapped in storage format
      return this.plainTextToStorage(markdown);
    }
  }

  /**
   * Extract plain text from HTML storage format
   */
  private static extractPlainText(html: string): string {
    // Remove HTML tags and decode entities
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .trim();
  }

  /**
   * Wrap HTML in Confluence storage format
   */
  private static wrapInStorageFormat(html: string): string {
    // Confluence storage format is valid XHTML/XML
    // Just ensure it's properly formatted
    return html.trim();
  }

  /**
   * Convert plain text to Confluence storage format
   */
  private static plainTextToStorage(text: string): string {
    // Escape special characters and wrap in paragraph tags
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    return `<p>${escaped}</p>`;
  }
}
