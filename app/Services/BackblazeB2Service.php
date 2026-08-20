<?php

namespace App\Services;

use Aws\Exception\AwsException;
use Aws\S3\S3Client;
use Exception;

class BackblazeB2Service
{
    private S3Client $client;
    private string $bucket;
    private bool $useProxy = true;

    public function __construct(
        string $keyId,
        string $applicationKey,
        string $bucket,
        string $endpoint,
        string $region,
    ) {
        $this->bucket = $bucket;

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

    public function url(string $remotePath): string
    {
        if (!$this->useProxy) {
            return $this->client->getObjectUrl($this->bucket, $remotePath);
        }

        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
        $host = $_SERVER['HTTP_HOST'];

        return $protocol . $host . '/admin/storage/file?path=' . urlencode(ltrim($remotePath, '/'));
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
}
