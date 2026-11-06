<?php

namespace App\Services;

use App\Contracts\VideoStorageProvider;
use App\Models\Video;

/**
 * Provider-neutral adapter around the existing Bunny implementation.
 *
 * This is intentionally composition instead of inheritance: the current
 * Bunny service remains backwards compatible while new providers can satisfy
 * the same contract without inheriting Bunny assumptions.
 */
final class BunnyStreamProvider implements VideoStorageProvider
{
    public function __construct(private readonly BunnyStreamService $service = new BunnyStreamService())
    {
    }

    public function key(): string
    {
        return 'bunny';
    }

    public function isConfigured(): bool
    {
        return $this->service->isConfigured();
    }

    public function createUpload(string $title, ?Video $video = null): array
    {
        unset($video);
        $remote = $this->service->createVideo($title);
        $remote['library_id'] = $this->service->configuredLibraryId();

        return [
            'storage_id' => (string) $remote['guid'],
            'provider_data' => $remote,
        ];
    }

    public function uploadAuthorization(string $storageId, int $ttlSeconds = 3600): array
    {
        return ['provider' => $this->key()] + $this->service->uploadCredentials($storageId, $ttlSeconds);
    }

    public function updateTitle(Video $video, string $title): void
    {
        $this->service->updateVideoTitle($video, $title);
    }

    public function delete(Video $video): void
    {
        $this->service->deleteVideo($video);
    }

    public function remoteExists(Video $video): ?bool
    {
        return $this->service->remoteVideoExists($video);
    }

    public function playbackUrl(Video $video, int $ttlSeconds = 900): string
    {
        return $this->service->playbackUrl($video, $ttlSeconds);
    }

    public function verifyCallback(
        string $rawBody,
        ?string $signature,
        ?string $version = null,
        ?string $algorithm = null,
    ): bool {
        return $this->service->verifyWebhook($rawBody, $signature, $version, $algorithm);
    }
}
