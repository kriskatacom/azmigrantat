<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Services\AuthRateLimiter;
use App\Services\TurnCredentialsService;

final class TurnCredentialsController extends BaseController
{
    public function show()
    {
        $user = $this->authenticatedUser();
        if (!$user) {
            return $this->json(['success' => false, 'message' => 'Необходима е автентикация.'], 401);
        }

        $service = new TurnCredentialsService();
        if (!$service->hasTurnSecret()) {
            error_log('[TURN] missing TURN_STATIC_AUTH_SECRET');
            return $this->json([
                'success' => false,
                'message' => 'TURN credentials временно не са налични.',
            ], 503);
        }

        $limiter = new AuthRateLimiter();
        $ip = AuthRateLimiter::clientIp();
        $userKey = (string) $user->id;

        if ($limiter->tooMany(AuthRateLimiter::ACTION_TURN_CREDENTIALS_USER, $userKey)) {
            return $this->jsonTooManyAuthAttempts(
                $limiter,
                AuthRateLimiter::ACTION_TURN_CREDENTIALS_USER,
                $userKey,
            );
        }

        if ($limiter->tooMany(AuthRateLimiter::ACTION_TURN_CREDENTIALS_IP, $ip)) {
            return $this->jsonTooManyAuthAttempts(
                $limiter,
                AuthRateLimiter::ACTION_TURN_CREDENTIALS_IP,
                $ip,
            );
        }

        $limiter->hit(AuthRateLimiter::ACTION_TURN_CREDENTIALS_USER, $userKey);
        $limiter->hit(AuthRateLimiter::ACTION_TURN_CREDENTIALS_IP, $ip);

        $issued = $service->issue((int) $user->id, time());

        return $this->json([
            'success' => true,
            'iceServers' => $issued['iceServers'],
            'expires_at' => $issued['expires_at'],
            'ttl' => $issued['ttl'],
        ]);
    }
}
