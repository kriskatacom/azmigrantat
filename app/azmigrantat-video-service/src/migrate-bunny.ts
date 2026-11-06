import { runBunnyMigration, type MigrationOptions } from './bunny-migration';

function positiveInteger(value: string | undefined, name: string): number | undefined {
    if (value === undefined) return undefined;
    if (!/^\d+$/.test(value) || Number(value) < 1 || !Number.isSafeInteger(Number(value))) throw new Error(`${name} must be a positive integer.`);
    return Number(value);
}

export function parseArgs(args: string[]): MigrationOptions {
    const has = (name: string) => args.includes(name);
    const value = (name: string) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; };
    const limit = value('--limit'); const videoId = value('--video-id'); const ownerId = value('--owner-id');
    return {
        dryRun: !has('--execute'),
        execute: has('--execute'),
        commit: has('--commit'),
        confirmCommit: has('--confirm-commit'),
        rollback: has('--rollback'),
        confirmRollback: has('--confirm-rollback'),
        resume: !has('--no-resume'),
        limit: positiveInteger(limit, '--limit'),
        videoId: positiveInteger(videoId, '--video-id'),
        ownerId: positiveInteger(ownerId, '--owner-id'),
        guid: value('--guid'),
        retries: positiveInteger(value('--retries') || '3', '--retries') || 3,
    };
}

function usage(): void {
    console.log(`Bunny migration is dry-run by default.

  npm run migrate:bunny -- [--execute] [--commit --confirm-commit]
    --video-id ID --owner-id ID --guid GUID [--retries N] [--no-resume]
  npm run migrate:bunny -- --rollback --confirm-rollback
    --video-id ID --owner-id ID --guid GUID

--execute downloads to the configured OneProvider root and runs the existing
FFprobe/FFmpeg processing path. --commit is additionally required to update
the PHP database, and must be paired with --confirm-commit. Bunny assets are
never deleted by this tool.`);
}

async function main(): Promise<void> {
    if (process.argv.includes('--help')) usage();
    else {
        const result = await runBunnyMigration(parseArgs(process.argv.slice(2)));
        console.log(JSON.stringify(result));
        if (result.failed > 0) process.exitCode = 1;
    }
}

if (require.main === module) {
    void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
