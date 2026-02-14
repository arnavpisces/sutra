import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Markdown renderer with optional native mdcat acceleration.
 * - Uses a bundled mdcat binary when present
 * - Falls back to system mdcat when available
 * - Falls back to plain markdown when no binary is available
 */
export class MdcatRenderer {
    private mdcatPath: string | null = null;
    private nativeAvailable = false;

    constructor() {
        this.detectMdcatBinary();
    }

    /**
     * Renderer is always available because we can fall back to plain markdown.
     */
    isAvailable(): boolean {
        return true;
    }

    /**
     * True when a native mdcat executable is available.
     */
    isNativeAvailable(): boolean {
        return this.nativeAvailable && Boolean(this.mdcatPath);
    }

    /**
     * Render markdown for terminal display.
     * Uses mdcat when available, otherwise returns plain markdown for in-app highlighting.
     */
    render(markdown: string, width?: number): string {
        if (!this.isNativeAvailable() || !this.mdcatPath) {
            return markdown;
        }

        try {
            const columns = Math.max(40, width || 80);
            const result = spawnSync(
                this.mdcatPath,
                [
                    '-P',
                    '--local',
                    '--columns',
                    String(columns),
                    '-',
                ],
                {
                    input: markdown,
                    encoding: 'utf-8',
                    timeout: 5000,
                    maxBuffer: 10 * 1024 * 1024,
                }
            );

            if (result.status !== 0 || !result.stdout) {
                return markdown;
            }

            return result.stdout;
        } catch {
            return markdown;
        }
    }

    private detectMdcatBinary(): void {
        const candidates = [
            process.env.ATLASSIAN_TUI_MDCAT_BIN || '',
            this.getBundledMdcatPath(),
            this.findSystemMdcatPath(),
        ].filter(Boolean);

        for (const candidate of candidates) {
            if (existsSync(candidate)) {
                this.mdcatPath = candidate;
                this.nativeAvailable = true;
                return;
            }
        }

        this.mdcatPath = null;
        this.nativeAvailable = false;
    }

    private getBundledMdcatPath(): string {
        const currentFile = fileURLToPath(import.meta.url);
        const packageRoot = path.resolve(path.dirname(currentFile), '../../..');
        const binaryName = process.platform === 'win32' ? 'mdcat.exe' : 'mdcat';

        const directPath = path.join(packageRoot, 'vendor', 'mdcat', binaryName);
        if (existsSync(directPath)) {
            return directPath;
        }

        return path.join(packageRoot, 'vendor', 'mdcat', 'bin', binaryName);
    }

    private findSystemMdcatPath(): string {
        try {
            const lookup = process.platform === 'win32'
                ? spawnSync('where', ['mdcat'], { encoding: 'utf-8', timeout: 2000 })
                : spawnSync('which', ['mdcat'], { encoding: 'utf-8', timeout: 2000 });

            if (lookup.status !== 0 || !lookup.stdout) {
                return '';
            }

            const firstLine = lookup.stdout
                .split('\n')
                .map(line => line.trim())
                .find(Boolean);

            return firstLine || '';
        } catch {
            return '';
        }
    }
}

export const mdcatRenderer = new MdcatRenderer();
