import { createClient, type RedisClientType } from 'redis';

import { config } from '../config';
import type { MediaNode } from '../media/media-node';

type RegistryState = 'disconnected' | 'connecting' | 'ready' | 'failed' | 'closed';

export class MediaNodeRegistry {
  private readonly client: RedisClientType;
  private timer: ReturnType<typeof setInterval> | null = null;
  private state: RegistryState = 'disconnected';

  constructor(private readonly mediaNode: MediaNode) {
    this.client = createClient({ url: config.redisUrl });
    this.client.on('error', (error) => {
      this.state = 'failed';
      console.error('[media-node] Redis error', error);
    });
  }

  async start(): Promise<void> {
    this.state = 'connecting';
    await this.client.connect();
    this.state = 'ready';
    await this.heartbeat();

    this.timer = setInterval(() => {
      void this.heartbeat().catch((error: unknown) => {
        this.state = 'failed';
        console.error('[media-node] Redis heartbeat failed', error);
      });
    }, config.heartbeatIntervalMs);
    this.timer.unref?.();
  }

  getHealth(): { state: RegistryState } {
    return { state: this.state };
  }

  async close(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (this.client.isOpen) {
      await this.client.del(this.key());
      await this.client.quit();
    }

    this.state = 'closed';
  }

  private async heartbeat(): Promise<void> {
    const health = this.mediaNode.getHealth();
    const payload = {
      node_id: config.nodeId,
      advertised_host: config.advertisedHost,
      control_host: config.controlHost,
      control_port: config.port,
      rtc_min_port: config.rtcMinPort,
      rtc_max_port: config.rtcMaxPort,
      state: health.state,
      worker_pid: health.worker_pid,
      router_id: health.router_id,
      updated_at: new Date().toISOString(),
    };

    await this.client.set(this.key(), JSON.stringify(payload), { EX: 15 });
  }

  private key(): string {
    return `media:nodes:${config.nodeId}`;
  }
}
