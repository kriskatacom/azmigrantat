import { randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { GpuCostLedgerEntry, GpuJobAuthorization } from './contracts';
import type { GpuOrchestratorConfig } from './config';

export class FileGpuCostLedger {
    constructor(private readonly path: string) {}

    async append(entry: Omit<GpuCostLedgerEntry, 'version' | 'event_id' | 'occurred_at' | 'currency'>): Promise<GpuCostLedgerEntry> {
        const complete: GpuCostLedgerEntry = { version: 1, event_id: randomUUID(), occurred_at: new Date().toISOString(), currency: 'USD', ...entry };
        await mkdir(dirname(this.path), { recursive: true, mode: 0o750 });
        await appendFile(this.path, `${JSON.stringify(complete)}\n`, { encoding: 'utf8', mode: 0o640 });
        return complete;
    }

    async accruedSince(since: Date): Promise<number> {
        let data = '';
        try { data = await readFile(this.path, 'utf8'); }
        catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 0; throw error; }
        let total = 0;
        for (const line of data.split('\n')) {
            if (!line) continue;
            const entry = JSON.parse(line) as Partial<GpuCostLedgerEntry>;
            if (entry.version !== 1 || typeof entry.occurred_at !== 'string') throw new Error('GPU cost ledger contains an invalid entry.');
            if (entry.event === 'cost_accrued' && new Date(entry.occurred_at) >= since) {
                if (typeof entry.amount !== 'number' || !Number.isFinite(entry.amount) || entry.amount < 0) throw new Error('GPU cost ledger contains an invalid amount.');
                total += entry.amount;
            }
        }
        return total;
    }
}

function startOfUtcDay(now: Date): Date { return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())); }
function startOfUtcMonth(now: Date): Date { return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)); }

export async function gpuProvisioningBlockers(input: {
    config: GpuOrchestratorConfig;
    ledger: FileGpuCostLedger;
    authorization: GpuJobAuthorization | null;
    modelManifestReady: boolean;
    activeInstances: number;
    quotedHourlyPrice: number;
    now?: Date;
}): Promise<string[]> {
    const { config, ledger, authorization, modelManifestReady, activeInstances, quotedHourlyPrice } = input;
    const now = input.now ?? new Date(); const blockers: string[] = [];
    if (!config.provisioningEnabled) blockers.push('gpu_provisioning_disabled');
    if (config.provider === 'disabled') blockers.push('gpu_provider_disabled');
    if (!config.commercialUseApproved) blockers.push('model_commercial_permission_missing');
    if (!modelManifestReady) blockers.push('model_manifest_not_ready');
    if (activeInstances >= config.maxActiveInstances) blockers.push('gpu_instance_limit_reached');
    if (!Number.isFinite(quotedHourlyPrice) || quotedHourlyPrice <= 0 || quotedHourlyPrice > config.maxHourlyPrice) blockers.push('gpu_hourly_price_exceeds_limit');
    if (!authorization || authorization.payment.state !== 'confirmed' || authorization.payment.job_id !== authorization.job_id) blockers.push('payment_reservation_not_confirmed');
    const daily = await ledger.accruedSince(startOfUtcDay(now)); const monthly = await ledger.accruedSince(startOfUtcMonth(now));
    if (config.maxDailyBudget <= 0 || daily >= config.maxDailyBudget) blockers.push('gpu_daily_budget_exhausted');
    if (config.maxMonthlyBudget <= 0 || monthly >= config.maxMonthlyBudget) blockers.push('gpu_monthly_budget_exhausted');
    return blockers;
}
