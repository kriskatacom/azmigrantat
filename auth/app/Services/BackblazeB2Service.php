<?php

namespace App\Services;

use Aws\Exception\AwsException;
use Aws\S3\S3Client;
use Exception;

class BackblazeB2Service
{
    private S3Client $client;
    private string $bucket;
    private string $cdnBaseUrl;
    private bool $useProxy = true;

    public function __construct(
        string $keyId,
        string $applicationKey,
        string $bucket,
        string $endpoint,
        string $region,
        ?string $cdnBaseUrl = null,
    ) {
        $this->bucket = $bucket;
        $this->cdnBaseUrl = self::normalizeCdnBaseUrl(
            $cdnBaseUrl ?? self::cdnBaseUrlFromEnv()
        );

        $this->client = new S3Client([
            'version' => 'latest',
            'region' => $region,
            'endpoint' => $endpoint,
            'credentials' => [
                'key' => $keyId,
                'secret' => $applicationKey,
            ],
            'use_path_style_endpoint' => true,
        ]);
    }

    public function setUseProxy(bool $useProxy): void
    {
        $this->useProxy = $useProxy;
    }

    public function upload(
        string $localFile,
        string $remotePath,
        ?string $contentType = null
    ): array {

        if (!file_exists($localFile)) {
            throw new Exception("File not found.");
        }

        if ($contentType === null) {
            $finfo = new \finfo(FILEINFO_MIME_TYPE);
            $contentType = $finfo->file($localFile);

            if (!$contentType) {
                $contentType = 'application/octet-stream';
            }
        }

        $result = $this->client->putObject([
            'Bucket' => $this->bucket,
            'Key' => $remotePath,
            'SourceFile' => $localFile,
            'ContentType' => $contentType,
            'CacheControl' => 'public, max-age=31536000, immutable',
        ]);

        return [
            'key' => $remotePath,
            'url' => $result['ObjectURL'] ?? null,
            'etag' => trim($result['ETag'], '"'),
        ];
    }

    public function delete(string $remotePath): bool
    {
        try {
            $versions = $this->client->listObjectVersions([
                'Bucket' => $this->bucket,
                'Prefix' => $remotePath,
            ]);

            $deletedAny = false;

            if (!empty($versions['Versions'])) {
                foreach ($versions['Versions'] as $version) {
                    if ($version['Key'] === $remotePath) {
                        $this->client->deleteObject([
                            'Bucket' => $this->bucket,
                            'Key' => $remotePath,
                            'VersionId' => $version['VersionId'],
                        ]);
                        $deletedAny = true;
                    }
                }
            }

            if (!empty($versions['DeleteMarkers'])) {
                foreach ($versions['DeleteMarkers'] as $marker) {
                    if ($marker['Key'] === $remotePath) {
                        $this->client->deleteObject([
                            'Bucket' => $this->bucket,
                            'Key' => $remotePath,
                            'VersionId' => $marker['VersionId'],
                        ]);
                        $deletedAny = true;
                    }
                }
            }

            if (!$deletedAny) {
                $this->client->deleteObject([
                    'Bucket' => $this->bucket,
                    'Key' => $remotePath,
                ]);
            }

            return true;

        } catch (AwsException $e) {
            return false;
        }
    }

    public function exists(string $remotePath): bool
    {
        return $this->client->doesObjectExist(
            $this->bucket,
            $remotePath
        );
    }

    public function url(string $key): string
    {
        $baseUrl = rtrim($this->cdnBaseUrl, '/');
        $key = ltrim($key, '/');

        return $baseUrl . '/' . $key;
    }

    public static function urlForKey(string $key, ?string $cdnBaseUrl = null): string
    {
        $baseUrl = rtrim(
            self::normalizeCdnBaseUrl($cdnBaseUrl ?? self::cdnBaseUrlFromEnv()),
            '/'
        );
        $key = ltrim($key, '/');

        return $baseUrl . '/' . $key;
    }

    public static function publicUrl(?string $stored): ?string
    {
        if ($stored === null) {
            return null;
        }

        $stored = trim($stored);
        if ($stored === '') {
            return null;
        }

        $key = self::extractObjectKey($stored);
        if ($key === null || $key === '') {
            return $stored;
        }

        return self::urlForKey($key);
    }

    public static function extractObjectKey(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = trim($value);
        if ($value === '') {
            return null;
        }

        if (str_contains($value, 'path=')) {
            $parts = parse_url($value);
            if (!empty($parts['query'])) {
                parse_str($parts['query'], $query);
                if (!empty($query['path']) && is_string($query['path'])) {
                    return ltrim($query['path'], '/');
                }
            }
        }

        if (!preg_match('#^https?://#i', $value)) {
            return ltrim($value, '/');
        }

        $parts = parse_url($value);
        $host = strtolower((string) ($parts['host'] ?? ''));
        $path = ltrim((string) ($parts['path'] ?? ''), '/');

        if ($host === '') {
            return $path !== '' ? $path : null;
        }

        $cdnHost = strtolower((string) (parse_url(self::cdnBaseUrlFromEnv(), PHP_URL_HOST) ?? ''));
        if ($cdnHost !== '' && $host === $cdnHost) {
            return $path !== '' ? $path : null;
        }

        if (preg_match('#^file/([^/]+)/(.+)$#', $path, $matches)) {
            return $matches[2];
        }

        $bucket = self::configuredBucketName();
        if ($bucket !== '' && str_starts_with($path, $bucket . '/')) {
            return substr($path, strlen($bucket) + 1);
        }

        if (preg_match('#^(.+)\.s3[.-]#i', $host)) {
            return $path !== '' ? $path : null;
        }

        if (
            str_contains($host, 'backblazeb2.com')
            && preg_match('#^[^/]+/(.+)$#', $path, $matches)
        ) {
            return $matches[1];
        }

        return $path !== '' ? $path : null;
    }

    /**
     * @param mixed $metadata
     * @return mixed
     */
    public static function serializeAttachmentMetadata($metadata)
    {
        if (is_string($metadata)) {
            $decoded = json_decode($metadata, true);
            $metadata = is_array($decoded) ? $decoded : $metadata;
        }

        if (!is_array($metadata)) {
            return $metadata;
        }

        if (!empty($metadata['key']) && is_string($metadata['key'])) {
            $metadata['url'] = self::urlForKey($metadata['key']);
            return $metadata;
        }

        if (!empty($metadata['url']) && is_string($metadata['url'])) {
            $metadata['url'] = self::publicUrl($metadata['url']);
        }

        return $metadata;
    }

    public function getBucketName(): string
    {
        return $this->bucket;
    }

    public function download(string $remotePath): string
    {
        $result = $this->client->getObject([
            'Bucket' => $this->bucket,
            'Key' => $remotePath,
        ]);

        return (string) $result['Body'];
    }

    public static function cdnBaseUrlFromEnv(): string
    {
        $value = self::firstEnvValue('B2_CDN_BASE_URL', 'B2_CDN_BASE_URL');

        return self::normalizeCdnBaseUrl((string) $value);
    }

    private static function configuredBucketName(): string
    {
        return trim((string) (
            self::firstEnvValue('B2_BUCKET', 'B2_BUCKET')
        ));
    }


    private static function firstEnvValue(string ...$keys): string
    {
        foreach ($keys as $key) {
            $value = $_ENV[$key] ?? getenv($key);
            if (is_string($value) && trim($value) !== '') {
                return trim($value);
            }
        }

        return '';
    }

    private static function normalizeCdnBaseUrl(string $baseUrl): string
    {
        $baseUrl = rtrim(trim($baseUrl), '/');

        return $baseUrl !== ''
            ? $baseUrl
            : 'https://cdn.azmigrantat.com';
    }
}
