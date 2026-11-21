import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { VideoServiceConfig } from './config';
import { redisCommand } from './queue';
import type { AiWorkerReadiness, EnhancementTargetShortSide } from './types';

type AdapterPreflight = {
    protocol_version: 1;
    ready: true;
    engine: string;
    adapter_fingerprint: string;
    model_fingerprint: string;
    supported_target_short_sides: EnhancementTargetShortSide[];
    enforces_workspace_limit: true;
};

function validTargets(value: unknown): value is EnhancementTargetShortSide[] {
    return Array.isArray(value) && value.length === 1 && value[0] === 720;
}

function validSha256(value: unknown): value is string { return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value); }

export async function preflightAiAdapter(config: VideoServiceConfig): Promise<AdapterPreflight> {
    if (!config.enhancementAiEnabled || config.enhancementAiEngine === 'disabled' || !config.enhancementAiCommand) {
        throw new Error('AI enhancement is disabled.');
    }
    const output = await new Promise<string>((resolve, reject) => {
        const child = spawn(config.enhancementAiCommand, ['--preflight', '--protocol-version', '1'], { shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = ''; let stderr = ''; let settled = false;
        const finish = (error?: Error) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            error ? reject(error) : resolve(stdout.trim());
        };
        const timer = setTimeout(() => { child.kill('SIGKILL'); finish(new Error('AI adapter preflight timed out.')); }, 10_000);
        child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
        child.stdout.on('data', (chunk) => { stdout = (stdout + chunk).slice(-16_384); });
        child.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-4_096); });
        child.once('error', finish);
        child.once('close', (code) => code === 0 ? finish() : finish(new Error(`AI adapter preflight failed (${code}): ${stderr}`)));
    });
    let parsed: Partial<AdapterPreflight>;
    try { parsed = JSON.parse(output) as Partial<AdapterPreflight>; }
    catch { throw new Error('AI adapter preflight did not return JSON.'); }
    if (parsed.protocol_version !== 1 || parsed.ready !== true || parsed.engine !== config.enhancementAiEngine
        || !validSha256(parsed.adapter_fingerprint)
        || !validSha256(parsed.model_fingerprint)
        || !validTargets(parsed.supported_target_short_sides) || parsed.enforces_workspace_limit !== true) throw new Error('AI adapter preflight contract is invalid.');
    if (!validSha256(config.enhancementAiModelFingerprint) || parsed.model_fingerprint !== config.enhancementAiModelFingerprint) throw new Error('AI model fingerprint does not match configuration.');
    if (!validSha256(config.enhancementAiAdapterFingerprint) || parsed.adapter_fingerprint !== config.enhancementAiAdapterFingerprint) throw new Error('AI adapter fingerprint does not match configuration.');
    return parsed as AdapterPreflight;
}

export async function publishAiReadiness(config: VideoServiceConfig, preflight: AdapterPreflight, workerId: string): Promise<AiWorkerReadiness> {
    const now = Date.now();
    const readiness: AiWorkerReadiness = {
        ...preflight,
        worker_id: workerId,
        checked_at: new Date(now).toISOString(),
        expires_at: now + config.enhancementAiReadinessTtlSeconds * 1000,
    };
    await redisCommand(config.redisUrl, ['SET', config.enhancementAiReadinessKey, JSON.stringify(readiness), 'EX', String(config.enhancementAiReadinessTtlSeconds)]);
    return readiness;
}

export async function readAiReadiness(config: VideoServiceConfig): Promise<AiWorkerReadiness | null> {
    const raw = await redisCommand(config.redisUrl, ['GET', config.enhancementAiReadinessKey]);
    if (typeof raw !== 'string') return null;
    try {
        const value = JSON.parse(raw) as Partial<AiWorkerReadiness>;
        if (value.protocol_version !== 1 || value.ready !== true || value.engine !== config.enhancementAiEngine
            || typeof value.worker_id !== 'string' || !validSha256(value.adapter_fingerprint)
            || !validSha256(value.model_fingerprint) || !validTargets(value.supported_target_short_sides)
            || typeof value.expires_at !== 'number' || value.expires_at <= Date.now()) return null;
        if (!validSha256(config.enhancementAiModelFingerprint) || value.model_fingerprint !== config.enhancementAiModelFingerprint) return null;
        if (!validSha256(config.enhancementAiAdapterFingerprint) || value.adapter_fingerprint !== config.enhancementAiAdapterFingerprint) return null;
        return value as AiWorkerReadiness;
    } catch { return null; }
}

export async function clearAiReadiness(config: VideoServiceConfig): Promise<void> {
    await redisCommand(config.redisUrl, ['DEL', config.enhancementAiReadinessKey]);
}

export function newAiWorkerId(): string { return randomUUID(); }
