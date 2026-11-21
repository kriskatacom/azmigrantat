import { createServer } from 'node:http';
import { gpuActivationBlockers, loadGpuOrchestratorConfig } from './gpu/config';
import { loadConfig } from './config';
import { GatewayError, GpuWorkerGateway } from './gpu/worker-gateway';

async function start(): Promise<void> {
    const config = loadGpuOrchestratorConfig();
    const blockers = gpuActivationBlockers(config);
    if (config.provisioningEnabled) throw new Error(`GPU provisioning cannot start before all activation gates are wired and reviewed: ${blockers.join(', ') || 'provider adapter not activated'}`);
    const gateway = config.workerEndpointsEnabled ? new GpuWorkerGateway(config, loadConfig()) : null;
    if (gateway) await gateway.init();
    const server = createServer((request, response) => { void (async () => {
        response.setHeader('content-type', 'application/json');
        response.setHeader('cache-control', 'no-store');
        if (request.method === 'GET' && request.url === '/health') {
            response.writeHead(200).end(JSON.stringify({ ok: true, provisioning_enabled: false, user_available: false }));
            return;
        }
        if (request.method === 'GET' && request.url === '/ready') {
            response.writeHead(503).end(JSON.stringify({ ready: false, provisioning_enabled: false, blockers }));
            return;
        }
        if (gateway && await gateway.handle(request, response)) return;
        response.writeHead(404).end(JSON.stringify({ error: 'not_found' }));
    })().catch((error) => { const status = error instanceof GatewayError ? error.status : 500; if (!response.headersSent) response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); response.end(JSON.stringify({ error: error instanceof GatewayError ? error.code : 'internal_error' })); }); });
    server.listen(config.port, config.host, () => console.log(`Disabled GPU orchestrator status endpoint listening on http://${config.host}:${config.port}`));
}

void start().catch((error) => { console.error(error); process.exitCode = 1; });
