<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\OauthAccessToken;

class BaseApiController extends BaseController
{
    protected function isAuthorizedRequest(): bool
    {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null);

        if (!$authHeader || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            return false;
        }

        $token = $matches[1];

        return $this->validateToken($token);
    }

    private function validateToken(string $token): bool
    {
        $accessToken = OauthAccessToken::where('token', $token)->first();

        if (!$accessToken || $accessToken->isExpired()) {
            return $this->json(['error' => 'invalid_or_expired_token'], 401);
        }

        return false;
    }
}
