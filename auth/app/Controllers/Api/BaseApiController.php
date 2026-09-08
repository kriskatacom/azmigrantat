<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\OauthAccessToken;

class BaseApiController extends BaseController
{
    protected function isAuthorizedRequest(): bool
    {
        return OauthAccessToken::userFromRequest() !== null;
    }
}
