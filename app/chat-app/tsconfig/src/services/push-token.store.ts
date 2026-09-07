import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const STORE_PATH = path.join(process.cwd(), 'data', 'push-tokens.json');

type TokenRecord = {
    token: string;
    updated_at: number;
};

type TokenFile = Record<string, TokenRecord[]>;

function isExpoPushToken(value: string): boolean {
    return value.startsWith('ExponentPushToken[') || value.startsWith('ExpoPushToken[');
}

export class PushTokenStore {
    private readonly tokensByUser = new Map<number, Map<string, number>>();
    private loaded = false;
    private writeQueue: Promise<void> = Promise.resolve();

    async ready(): Promise<void> {
        if (this.loaded) {
            return;
        }

        this.loaded = true;

        try {
            const raw = await readFile(STORE_PATH, 'utf8');
            const parsed = JSON.parse(raw) as TokenFile;

            for (const [userIdValue, records] of Object.entries(parsed)) {
                const userId = Number(userIdValue);

                if (!Number.isInteger(userId) || userId <= 0 || !Array.isArray(records)) {
                    continue;
                }

                const userTokens = new Map<string, number>();

                for (const record of records) {
                    if (!record?.token || !isExpoPushToken(record.token)) {
                        continue;
                    }

                    userTokens.set(record.token, Number(record.updated_at) || Date.now());
                }

                if (userTokens.size > 0) {
                    this.tokensByUser.set(userId, userTokens);
                }
            }
        } catch {
            // Missing file is expected on first run.
        }
    }

    async register(userId: number, token: string): Promise<void> {
        if (!isExpoPushToken(token)) {
            return;
        }

        await this.ready();

        const userTokens = this.tokensByUser.get(userId) ?? new Map<string, number>();
        userTokens.set(token, Date.now());
        this.tokensByUser.set(userId, userTokens);
        await this.persist();
    }

    async get(userId: number): Promise<string[]> {
        await this.ready();

        return [...(this.tokensByUser.get(userId)?.keys() ?? [])];
    }

    private async persist(): Promise<void> {
        this.writeQueue = this.writeQueue.then(async () => {
            const serialized: TokenFile = {};

            for (const [userId, tokens] of this.tokensByUser.entries()) {
                serialized[String(userId)] = [...tokens.entries()].map(([token, updated_at]) => ({
                    token,
                    updated_at,
                }));
            }

            await mkdir(path.dirname(STORE_PATH), { recursive: true });
            await writeFile(STORE_PATH, `${JSON.stringify(serialized, null, 2)}\n`);
        });

        await this.writeQueue.catch((error: unknown) => {
            console.error('Неуспешен запис на push tokens:', error);
        });
    }
}

export const pushTokenStore = new PushTokenStore();
