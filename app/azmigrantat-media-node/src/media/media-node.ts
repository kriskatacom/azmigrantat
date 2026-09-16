import * as mediasoup from 'mediasoup';
import type { types } from 'mediasoup';

import { config } from '../config';

const mediaCodecs: types.RouterRtpCodecCapability[] = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48_000,
    channels: 2,
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90_000,
  },
];

export class MediaNode {
  private worker: types.Worker | null = null;
  private router: types.Router | null = null;
  private state: 'starting' | 'ready' | 'failed' | 'closed' = 'starting';

  async start(): Promise<void> {
    if (this.worker || this.state === 'closed') {
      throw new Error('Media node is already started or closed.');
    }

    try {
      this.worker = await mediasoup.createWorker({
        logLevel: 'warn',
        rtcMinPort: config.rtcMinPort,
        rtcMaxPort: config.rtcMaxPort,
      });

      this.worker.on('died', () => {
        this.state = 'failed';
        console.error(`[media-node] mediasoup worker died for ${config.nodeId}`);
      });

      this.router = await this.worker.createRouter({ mediaCodecs });
      this.state = 'ready';

      console.log(
        `[media-node] ${config.nodeId} ready with worker ${this.worker.pid} and router ${this.router.id}`,
      );
    } catch (error) {
      this.state = 'failed';
      await this.close();
      throw error;
    }
  }

  getHealth(): {
    state: string;
    worker_pid: number | null;
    router_id: string | null;
  } {
    return {
      state: this.state,
      worker_pid: this.worker?.pid ?? null,
      router_id: this.router?.id ?? null,
    };
  }

  getRouterRtpCapabilities(): types.RouterRtpCapabilities {
    if (!this.router || this.state !== 'ready') {
      throw new Error('Media node router is not ready.');
    }

    return this.router.rtpCapabilities;
  }

  async createWebRtcTransport(): Promise<types.WebRtcTransport> {
    if (!this.router || this.state !== 'ready') {
      throw new Error('Media node router is not ready.');
    }

    return this.router.createWebRtcTransport({
      listenInfos: [
        {
          protocol: 'udp',
          ip: '0.0.0.0',
          announcedAddress: config.advertisedHost,
          portRange: { min: config.rtcMinPort, max: config.rtcMaxPort },
        },
        {
          protocol: 'tcp',
          ip: '0.0.0.0',
          announcedAddress: config.advertisedHost,
          portRange: { min: config.rtcMinPort, max: config.rtcMaxPort },
        },
      ],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    });
  }

  canConsume(producerId: string, rtpCapabilities: types.RtpCapabilities): boolean {
    if (!this.router || this.state !== 'ready') {
      return false;
    }

    return this.router.canConsume({ producerId, rtpCapabilities });
  }

  async close(): Promise<void> {
    this.router?.close();
    this.router = null;
    this.worker?.close();
    this.worker = null;
    this.state = 'closed';
  }
}
