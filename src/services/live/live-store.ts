import type { LiveRole } from '../../types/live';

export interface LiveOccupant {
    userId: number;
    role: LiveRole;
}

export class InMemoryLiveStore {
    private readonly rooms = new Map<number, Map<string, LiveOccupant>>();

    join(liveId: number, socketId: string, occupant: LiveOccupant): void {
        const room = this.rooms.get(liveId) ?? new Map<string, LiveOccupant>();
        room.set(socketId, occupant);
        this.rooms.set(liveId, room);
    }

    leave(liveId: number, socketId: string): LiveOccupant | null {
        const room = this.rooms.get(liveId);

        if (!room) {
            return null;
        }

        const occupant = room.get(socketId) ?? null;
        room.delete(socketId);

        if (room.size === 0) {
            this.rooms.delete(liveId);
        }

        return occupant;
    }

    leaveAll(socketId: string): number[] {
        const leftLiveIds: number[] = [];

        for (const liveId of [...this.rooms.keys()]) {
            if (this.leave(liveId, socketId)) {
                leftLiveIds.push(liveId);
            }
        }

        return leftLiveIds;
    }

    clear(liveId: number): void {
        this.rooms.delete(liveId);
    }

    viewerCount(liveId: number): number {
        const room = this.rooms.get(liveId);

        if (!room) {
            return 0;
        }

        const viewerIds = new Set<number>();

        for (const occupant of room.values()) {
            if (occupant.role === 'viewer') {
                viewerIds.add(occupant.userId);
            }
        }

        return viewerIds.size;
    }

    has(liveId: number, socketId: string): boolean {
        return this.rooms.get(liveId)?.has(socketId) ?? false;
    }
}
