import { statfs } from 'node:fs/promises';

export class DiskSpaceGuard {
    constructor(private readonly root: string, private readonly minimumFreeBytes: number) {}
    async assertEnough(additionalBytes = 0): Promise<void> {
        const filesystem = await statfs(this.root);
        const freeBytes = Number(filesystem.bavail) * Number(filesystem.bsize);
        if (!Number.isSafeInteger(freeBytes) || freeBytes < this.minimumFreeBytes + Math.max(0, additionalBytes)) throw new Error(`Insufficient free disk space (${freeBytes} bytes available).`);
    }
}
