import { homedir } from 'os';
import { join } from 'path';

export function getDownloadsDir(): string {
  return join(homedir(), 'Downloads');
}

export function normalizeDraggedPath(input: string): string {
  // Drag & drop often wraps paths in quotes or escapes spaces
  const trimmed = input.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed.replace(/\\ /g, ' ');
}
