<?php

$failures = 0;
function checkFacebookAuth(string $name, bool $condition): void
{
    global $failures;
    if (!$condition) {
        $failures++;
        fwrite(STDERR, "FAIL {$name}\n");
        return;
    }
    echo "OK {$name}\n";
}

$controller = file_get_contents(__DIR__ . '/../app/Controllers/Api/MobileAuthController.php');
$verifier = file_get_contents(__DIR__ . '/../app/Services/FacebookTokenVerifier.php');
$feature = file_get_contents(__DIR__ . '/../app/Services/FacebookAuthFeature.php');
$routes = file_get_contents(__DIR__ . '/../routes/web.php');

checkFacebookAuth('feature is deny by default', str_contains($feature, "?: 'false'"));
checkFacebookAuth('feature is development-only', str_contains($feature, "environment !== 'development'"));
checkFacebookAuth('feature requires a dedicated allowed client', str_contains($feature, 'FACEBOOK_ALLOWED_CLIENT_IDS'));
checkFacebookAuth('public login checks feature flag', str_contains($controller, '!FacebookAuthFeature::isEnabled()'));
checkFacebookAuth('existing email requires explicit linking', str_contains($controller, "'facebook_link_required'"));
checkFacebookAuth('deleted users are resolved explicitly', str_contains($controller, 'User::withTrashed()'));
checkFacebookAuth('linking requires password verification', str_contains($controller, 'password_verify'));
checkFacebookAuth('linking is bearer protected', str_contains($routes, "linkFacebook'], \$bearer"));
checkFacebookAuth('token app id is verified', str_contains($verifier, "hash_equals(\$appId"));
checkFacebookAuth('token and data access expiry are verified', str_contains($verifier, 'data_access_expires_at'));
checkFacebookAuth('missing expiry fails closed', str_contains($verifier, '$expiresAt <= time()'));
checkFacebookAuth('Graph calls have connect and request timeouts', str_contains($verifier, 'CURLOPT_CONNECTTIMEOUT') && str_contains($verifier, 'CURLOPT_TIMEOUT'));
checkFacebookAuth('Graph response size is capped', str_contains($verifier, 'MAX_RESPONSE_BYTES'));
checkFacebookAuth('app secret proof protects profile lookup', str_contains($verifier, 'appsecret_proof'));
checkFacebookAuth('access tokens are not written to logs', !str_contains($verifier, 'error_log'));

if ($failures > 0) {
    fwrite(STDERR, "{$failures} failing assertion(s)\n");
    exit(1);
}

echo "All Facebook auth contract assertions passed.\n";
