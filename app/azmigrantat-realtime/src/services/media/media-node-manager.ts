import { createClient, type RedisClientType } from 'redis';

import { config } from '../../config';

export type MediaNodeDescriptor = {
    node_id: string;
    advertised_host: string;
    control_host: string;
    control_port: number;
    rtc_min_port: number;
    rtc_max_port: number;
    state: string;
    worker_pid: number | null;
    router_id: string | null;
    updated_at: string;
};

export type MediaAssignment = {
    live_id: number;
    media_room_id: string;
    media_provider: 'mediasoup';
    media_node_id: string;
    signaling_endpoint: string;
    rtc_host: string;
    router_id: string | null;
};

const NODE_KEY_PREFIX = 'media:nodes:';
const ROOM_KEY_PREFIX = 'media:rooms:';
const ASSIGNMENT_TTL_SECONDS = 86_400;

export class MediaNodeManager {
    private readonly client: RedisClientType;

    constructor() {
        this.client = createClient({ url: config.redisUrl });
        this.client.on('error', (error) => {
            console.error('[media-manager] Redis error', error);
        });
    }

    async start(): Promise<void> {
        await this.client.connect();
    }

    async close(): Promise<void> {
        if (this.client.isOpen) {
            await this.client.quit();
        }
    }

    async listNodes(): Promise<MediaNodeDescriptor[]> {
        const nodes: MediaNodeDescriptor[] = [];

        for await (const keys of this.client.scanIterator({
            MATCH: `${NODE_KEY_PREFIX}*`,
            COUNT: 100,
        })) {
            for (const key of keys) {
                const raw = await this.client.get(key);

                if (!raw) {
                    continue;
                }

                try {
                    const node = JSON.parse(raw) as Partial<MediaNodeDescriptor>;

                    if (
                        typeof node.node_id === 'string' &&
                    typeof node.advertised_host === 'string' &&
                    typeof node.control_host === 'string' &&
                        typeof node.control_port === 'number' &&
                        typeof node.state === 'string'
                    ) {
                        nodes.push(node as MediaNodeDescriptor);
                    }
                } catch {
                    console.warn(`[media-manager] ignored malformed node descriptor: ${key}`);
                }
            }
        }

        return nodes.filter((node) => node.state === 'ready');
    }

    async getAssignment(liveId: number): Promise<MediaAssignment | null> {
        const raw = await this.client.get(this.roomKey(liveId));

        if (!raw) {
            return null;
        }

        try {
            return JSON.parse(raw) as MediaAssignment;
        } catch {
            return null;
        }
    }

    async createSession(liveId: number, role: 'streamer' | 'viewer'): Promise<Record<string, unknown>> {
        const assignment = await this.getAssignment(liveId);

        if (!assignment) {
            throw new Error('Media assignment not found.');
        }

        const node = (await this.listNodes()).find((item) => item.node_id === assignment.media_node_id);

        if (!node) {
            throw new Error('Assigned media node is not available.');
        }

        const response = await fetch(
            `http://${node.control_host}:${node.control_port}/v1/rooms/${encodeURIComponent(assignment.media_room_id)}/session`,
            {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-Media-Node-Secret': config.mediaNodeInternalSecret,
                },
                body: JSON.stringify({ role }),
                signal: AbortSignal.timeout(5_000),
            },
        );

        if (!response.ok) {
            throw new Error(`Media node session creation failed with HTTP ${response.status}.`);
        }

        const payload = (await response.json()) as { session?: unknown };

        if (!payload.session || typeof payload.session !== 'object') {
            throw new Error('Media node returned an invalid session.');
        }

        return payload.session as Record<string, unknown>;
    }

    async allocate(liveId: number, mediaRoomId: string): Promise<MediaAssignment> {
        const existing = await this.getAssignment(liveId);

        if (existing) {
            return existing;
        }

        const nodes = await this.listNodes();

        if (nodes.length === 0) {
            throw new Error('Няма наличен mediasoup media node.');
        }

        const load = await this.assignmentCountByNode();
        const orderedNodes = [...nodes].sort(
            (left, right) => (load.get(left.node_id) ?? 0) - (load.get(right.node_id) ?? 0),
        );

        for (const node of orderedNodes) {
            const assignment: MediaAssignment = {
                live_id: liveId,
                media_room_id: mediaRoomId,
                media_provider: 'mediasoup',
                media_node_id: node.node_id,
                signaling_endpoint: `http://${node.advertised_host}:${node.control_port}`,
                rtc_host: node.advertised_host,
                router_id: node.router_id,
            };

            const created = await this.client.set(
                this.roomKey(liveId),
                JSON.stringify(assignment),
                { NX: true, EX: ASSIGNMENT_TTL_SECONDS },
            );

            if (created === 'OK') {
                return assignment;
            }

            const racedAssignment = await this.getAssignment(liveId);

            if (racedAssignment) {
                return racedAssignment;
            }
        }

        throw new Error('Неуспешно резервиране на media node за live предаването.');
    }

    async release(liveId: number): Promise<void> {
        await this.client.del(this.roomKey(liveId));
    }

    private async assignmentCountByNode(): Promise<Map<string, number>> {
        const counts = new Map<string, number>();

        for await (const keys of this.client.scanIterator({
            MATCH: `${ROOM_KEY_PREFIX}*`,
            COUNT: 100,
        })) {
            for (const key of keys) {
                const raw = await this.client.get(key);

                if (!raw) {
                    continue;
                }

                try {
                    const assignment = JSON.parse(raw) as Partial<MediaAssignment>;

                    if (typeof assignment.media_node_id === 'string') {
                        counts.set(
                            assignment.media_node_id,
                            (counts.get(assignment.media_node_id) ?? 0) + 1,
                        );
                    }
                } catch {
                    // Ignore expired or malformed assignments during load calculation.
                }
            }
        }

        return counts;
    }

    private roomKey(liveId: number): string {
        return `${ROOM_KEY_PREFIX}${liveId}`;
    }
}
