<?php

namespace App\Middlewares;

use App\Models\OauthAccessToken;

final class BearerAuthMiddleware
{
    public function handle(): void
    {
        if (OauthAccessToken::userFromRequest()) {
            return;
        }

        header('Content-Type: application/json');
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Необходима е автентикация.',
        ]);
        exit;
    }
}
