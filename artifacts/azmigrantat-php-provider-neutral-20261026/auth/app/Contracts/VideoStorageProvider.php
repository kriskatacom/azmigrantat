<?php

namespace App\Contracts;

use App\Models\Video;

/**
 * Provider-neutral boundary for the short-video storage flow.
 *
 * Implementations own provider-specific identifiers, upload authorization,
 * playback URL generation and callbacks. Controllers should only persist the
 * returned provider key/identifier and must not depend on Bunny or a future
 * dedicated server's API shape.
 */
interface VideoStorageProvider
{
    public function key(): string;

    public function isConfigured(): bool;

    /**
     * Create the remote video object before the client starts uploading.
     *
     * @return array{storage_id: string, provider_data: array<string, mixed>}
     */
    public function createUpload(string $title, ?Video $video = null): array;

    /**
     * @return array<string, mixed>
     */
    public function uploadAuthorization(string $storageId, int $ttlSeconds = 3600): array;

    public function updateTitle(Video $video, string $title): void;

    public function delete(Video $video): void;

    /**
     * Returns null when the provider could not be checked safely.
     */
    public function remoteExists(Video $video): ?bool;

    public function playbackUrl(Video $video, int $ttlSeconds = 900): string;

    public function verifyCallback(
        string $rawBody,
        ?string $signature,
        ?string $version = null,
        ?string $algorithm = null,
    ): bool;
}
