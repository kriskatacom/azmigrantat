import { afterEach, describe, expect, it, vi } from 'vitest';

const { redisClient } = vi.hoisted(() => ({
    redisClient: {
        on: vi.fn(),
        connect: vi.fn(async () => undefined),
        quit: vi.fn(async () => undefined),
        get: vi.fn(),
        set: vi.fn(async () => 'OK'),
        del: vi.fn(async () => 1),
        scanIterator: vi.fn(),
    },
}));

vi.mock('redis', () => ({
    createClient: () => redisClient,
}));

import {
    isValidMediaNodeDescriptor,
    MediaNodeManager,
} from '../../src/services/media/media-node-manager';

const descriptor = {
    node_id: 'media-node-1',
    advertised_host: '185.199.38.75',
    signaling_url: 'https://live.azmigrantat.com',
    control_host: '10.50.0.2',
    control_port: 3002,
    rtc_min_port: 40000,
    rtc_max_port: 40099,
    state: 'ready',
    worker_pid: 123,
    router_id: 'router-1',
    updated_at: new Date().toISOString(),
};

function configureNodeScan(raw: unknown) {
    redisClient.scanIterator.mockImplementation((options: { MATCH: string }) =>
        (async function* () {
            if (options.MATCH === 'media:nodes:*') {
                yield ['media:nodes:media-node-1'];
            }
        })(),
    );
    redisClient.get.mockImplementation(async (key: string) =>
        key === 'media:nodes:media-node-1' ? JSON.stringify(raw) : null,
    );
}

afterEach(() => {
    vi.restoreAllMocks();
    redisClient.get.mockReset();
    redisClient.scanIterator.mockReset();
    redisClient.set.mockClear();
});

describe('media node descriptor', () => {
    it('accepts a descriptor with separate signaling, RTC and control addresses', () => {
        expect(isValidMediaNodeDescriptor(descriptor)).toBe(true);
    });

    it('rejects a descriptor without signaling_url', () => {
        const legacyDescriptor = { ...descriptor };
        delete (legacyDescriptor as { signaling_url?: string }).signaling_url;

        expect(isValidMediaNodeDescriptor(legacyDescriptor)).toBe(false);
    });
});

describe('MediaNodeManager', () => {
    it('ignores a malformed node without signaling_url', async () => {
        configureNodeScan({ ...descriptor, signaling_url: undefined });
        const manager = new MediaNodeManager();

        await expect(manager.listNodes()).resolves.toEqual([]);
    });

    it('uses signaling_url for allocation and control_host for internal session requests', async () => {
        configureNodeScan(descriptor);
        const manager = new MediaNodeManager();
        const fetchMock = vi.fn(
            async (url: string) =>
                new Response(JSON.stringify({ session: { session_id: 'session-1' } }), {
                    status: 201,
                    headers: { 'content-type': 'application/json' },
                }),
        );
        vi.stubGlobal('fetch', fetchMock);

        const assignment = await manager.allocate(7, 'room-7');

        expect(assignment.signaling_endpoint).toBe('https://live.azmigrantat.com');
        expect(assignment.rtc_host).toBe('185.199.38.75');

        redisClient.get.mockImplementation(async (key: string) =>
            key === 'media:rooms:7' ? JSON.stringify(assignment) : JSON.stringify(descriptor),
        );
        await manager.createSession(7, 'viewer');

        expect(fetchMock).toHaveBeenCalledWith(
            'http://10.50.0.2:3002/v1/rooms/room-7/session',
            expect.objectContaining({ method: 'POST' }),
        );
    });
});
