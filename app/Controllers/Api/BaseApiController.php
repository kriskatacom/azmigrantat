<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\OauthAccessToken;
use App\Models\User;

class BaseApiController extends BaseController
{
    protected function isAuthorizedRequest(): bool
    {
        return OauthAccessToken::userFromRequest() !== null;
    }

    protected function authenticatedUser(): ?User
    {
        return OauthAccessToken::userFromRequest();
    }
}
