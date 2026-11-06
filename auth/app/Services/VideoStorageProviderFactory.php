<?php

namespace App\Services;

use App\Contracts\VideoStorageProvider;
use App\Models\Video;
use RuntimeException;

final class VideoStorageProviderFactory
{
    public static function forNewUpload(): VideoStorageProvider
    {
        return self::make((string) env('VIDEO_STORAGE_PROVIDER', 'oneprovider'));
    }

    public static function forVideo(Video $video): VideoStorageProvider
    {
        $provider = trim((string) ($video->provider ?: 'bunny'));

        return self::make($provider);
    }

    private static function make(string $provider): VideoStorageProvider
    {
        return match (strtolower($provider)) {
            '', 'bunny' => new BunnyStreamProvider(),
            'oneprovider', 'dedicated' => new DedicatedVideoProvider(),
            default => throw new RuntimeException('Неподдържан video storage provider: ' . $provider),
        };
    }
}
