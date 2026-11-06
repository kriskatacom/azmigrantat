import { createHmac } from 'node:crypto';
import { mkdir, readdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { VideoServiceConfig } from './config';

type CallbackEvent = { event_id: string; payload: Record<string, unknown>; attempts: number; next_attempt_at: number };

export class StatusCallbackOutbox {
    private readonly directory: string;
    private readonly deliveredDirectory: string;
    constructor(private readonly config: VideoServiceConfig) { this.directory = join(config.root, 'state', 'callbacks'); this.deliveredDirectory = join(config.root, 'state', 'callback-delivered'); }
    async publish(payload: Record<string, unknown>): Promise<void> {
        if (!this.config.callbackUrl || !this.config.callbackSecret) return;
        const eventId = String(payload.event_id || ''); if (!/^[a-zA-Z0-9:_-]{1,180}$/.test(eventId)) throw new Error('Unsafe callback event id.');
        await mkdir(this.directory, { recursive: true, mode: 0o750 }); await mkdir(this.deliveredDirectory, { recursive: true, mode: 0o750 });
        if (await this.isDelivered(eventId)) return;
        const path = join(this.directory, `${eventId}.json`); let existing: CallbackEvent | null = null;
        try { existing = JSON.parse(await readFile(path, 'utf8')) as CallbackEvent; } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
        if (!existing) await this.save(path, { event_id: eventId, payload, attempts: 0, next_attempt_at: 0 });
        await this.flush();
    }
    async flush(): Promise<void> {
        if (!this.config.callbackUrl || !this.config.callbackSecret) return;
        await mkdir(this.directory, { recursive: true, mode: 0o750 });
        for (const name of await readdir(this.directory)) {
            if (!name.endsWith('.json')) continue;
            const path = join(this.directory, name); let event: CallbackEvent;
            try { event = JSON.parse(await readFile(path, 'utf8')) as CallbackEvent; } catch { continue; }
            if (event.next_attempt_at > Date.now()) continue;
            const body = JSON.stringify(event.payload); const timestamp = Math.floor(Date.now() / 1000).toString(); const signature = createHmac('sha256', this.config.callbackSecret).update(`${timestamp}.${body}`).digest('hex');
            try {
                const response = await fetch(this.config.callbackUrl, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Video-Service-Timestamp': timestamp, 'X-Video-Service-Signature': signature }, body, signal: AbortSignal.timeout(5000) });
                if (!response.ok) throw new Error(`callback HTTP ${response.status}`);
                await this.markDelivered(event.event_id); await unlink(path);
            } catch (error) {
                event.attempts += 1; event.next_attempt_at = Date.now() + Math.min(15 * 60 * 1000, 1000 * 2 ** Math.min(event.attempts, 10)); event.payload.last_delivery_error = error instanceof Error ? error.message : 'callback delivery failed'; await this.save(path, event);
            }
        }
    }
    private async isDelivered(eventId: string): Promise<boolean> { try { await readFile(join(this.deliveredDirectory, `${eventId}.json`)); return true; } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; } }
    private async markDelivered(eventId: string): Promise<void> { const path = join(this.deliveredDirectory, `${eventId}.json`); const temporary = `${path}.tmp`; await writeFile(temporary, JSON.stringify({ event_id: eventId, delivered_at: new Date().toISOString() }), { mode: 0o640 }); await rename(temporary, path); }
    private async save(path: string, event: CallbackEvent): Promise<void> { const temporary = `${path}.tmp`; await writeFile(temporary, JSON.stringify(event), { mode: 0o640 }); await rename(temporary, path); }
}
