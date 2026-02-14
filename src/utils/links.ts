import { spawn } from 'child_process';
import clipboard from 'clipboardy';

export function buildJiraIssueUrl(baseUrl: string, issueKey: string): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  return `${cleanBase}/browse/${issueKey}`;
}

export function resolveUrl(baseUrl: string, pathOrUrl: string): string {
  if (!pathOrUrl) return baseUrl;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const cleanBase = baseUrl.replace(/\/+$/, '');
  let cleanPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  if (cleanBase.endsWith('/wiki') && cleanPath.startsWith('/wiki/')) {
    cleanPath = cleanPath.replace(/^\/wiki/, '');
  }
  return `${cleanBase}${cleanPath}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await clipboard.write(text);
    return true;
  } catch {
    return false;
  }
}

export function openInBrowser(url: string): void {
  const platform = process.platform;
  let cmd = 'xdg-open';
  let args = [url];

  if (platform === 'darwin') {
    cmd = 'open';
    args = [url];
  } else if (platform === 'win32') {
    cmd = 'cmd';
    args = ['/c', 'start', '', url];
  }

  const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
  child.unref();
}
