<?php

$failures = 0;

function checkRouting(string $name, bool $condition): void
{
    global $failures;
    if (!$condition) {
        $failures++;
        fwrite(STDERR, "FAIL {$name}\n");
        return;
    }
    echo "OK {$name}\n";
}

$controller = file_get_contents(__DIR__ . '/../app/Controllers/Api/VideoController.php');
$userController = file_get_contents(__DIR__ . '/../app/Controllers/Api/UserController.php');
$factory = file_get_contents(__DIR__ . '/../app/Services/VideoStorageProviderFactory.php');
$videoModel = file_get_contents(__DIR__ . '/../app/Models/Video.php');
checkRouting('video controller source is readable', is_string($controller));
checkRouting('new uploads default to OneProvider', is_string($factory) && str_contains($factory, "env('VIDEO_STORAGE_PROVIDER', 'oneprovider')"));
checkRouting('legacy records without provider still route to Bunny', is_string($factory) && str_contains($factory, "\$video->provider ?: 'bunny'"));
checkRouting('schema guard uses the active Eloquent connection', is_string($videoModel) && str_contains($videoModel, 'getConnection()->getSchemaBuilder()'));
checkRouting('schema guard does not require an unbound Laravel facade', is_string($videoModel) && !str_contains($videoModel, 'Facades\\Schema') && !str_contains($videoModel, 'Schema::hasColumn'));
checkRouting('new uploads select provider through factory', is_string($controller) && str_contains($controller, 'VideoStorageProviderFactory::forNewUpload()'));
checkRouting('stored videos select provider through factory', is_string($controller) && str_contains($controller, 'VideoStorageProviderFactory::forVideo($video)'));
checkRouting('Bunny upload creation is behind provider contract', is_string($controller) && str_contains($controller, '$provider->createUpload($title)'));
checkRouting('upload authorization is behind provider contract', is_string($controller) && str_contains($controller, '$provider->uploadAuthorization($remote[\'storage_id\'])'));
checkRouting('legacy Bunny webhook remains explicit', is_string($controller) && str_contains($controller, "new BunnyStreamService()"));
checkRouting('profile reconciliation skips non-Bunny providers', is_string($userController) && str_contains($userController, "\$provider->key() !== 'bunny'"));
checkRouting('ownership filters remain on mutating endpoints', is_string($controller) && substr_count($controller, "where('user_id', (int) \$user->id)") >= 4);
checkRouting('legacy schema guard exists for provider metadata', is_string($controller) && str_contains($controller, 'Video::providerMetadataAvailable()'));
checkRouting('legacy Bunny uploads omit provider columns when absent', is_string($controller) && str_contains($controller, "if (\$providerMetadataAvailable)"));
checkRouting('legacy Bunny upload sessions fall back to Bunny guid', is_string($controller) && str_contains($controller, '$video->provider_video_id ?: $video->bunny_video_guid'));

if ($failures > 0) {
    fwrite(STDERR, "{$failures} failing assertion(s)\n");
    exit(1);
}

echo "All routing contract assertions passed.\n";
