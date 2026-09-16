import type { Express } from 'express';

import { config } from '../config';
import type { MediaNode } from '../media/media-node';
import type { MediaNodeRegistry } from '../registry/media-node-registry';

export function registerHealthRoutes(
  app: Express,
  mediaNode: MediaNode,
  registry: MediaNodeRegistry,
): void {
  app.get('/health', (_request, response) => {
    const health = mediaNode.getHealth();

    response.json({
      success: health.state === 'ready',
      service: 'azmigrantat-media-node',
      node_id: config.nodeId,
      ...health,
      redis: registry.getHealth(),
      timestamp: new Date().toISOString(),
    });
  });
}
