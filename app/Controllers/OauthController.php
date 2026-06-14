<?php

namespace App\Controllers;

use App\Models\OauthAccessToken;
use App\Models\OauthApp;
use App\Models\OauthAuthCode;
use App\Core\Auth;
use App\Models\OauthConsent;
use App\Models\User;
use Exception;

class OauthController extends BaseController
{
    public function authorize()
    {
        $clientId = $_GET['client_id'] ?? null;
        $redirectUri = $_GET['redirect_uri'] ?? null;

        $app = OauthApp::where('client_id', $clientId)
            ->where('is_active', 1)
            ->first();

        if (!$app) {
            $this->abort404();
        }

        if ($app->redirect_uri !== $redirectUri) {
            die("Грешка: redirect_uri не съвпада с регистрирания за това приложение.");
        }

        $hasConsented = OauthConsent::where('user_id', Auth::id())
            ->where('app_id', $app->id)
            ->exists();

        if ($hasConsented) {
            return $this->approve();
        }

        if (!Auth::check()) {
            $this->redirect('/users/login?return_to=' . urlencode($_SERVER['REQUEST_URI']));
        }

        $hasAuthorized = OauthAccessToken::where('user_id', Auth::id())
            ->where('app_id', $app->id)
            ->exists();

        if ($hasAuthorized) {
            return $this->approve();
        }

        $this->renderWithSeo('/oauth/authorize', [
            'title' => 'Оторизация - ' . $app->name,
        ], [
            'app' => $app,
            'redirect_uri' => $redirectUri,
            'state' => $_GET['state'] ?? ''
        ]);
    }

    #[HandleExceptions]
    public function approve()
    {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $this->validateSpam();
        }

        $clientId = $_POST['client_id'] ?? $_GET['client_id'] ?? null;
        $redirectUri = $_POST['redirect_uri'] ?? $_GET['redirect_uri'] ?? null;
        $state = $_POST['state'] ?? $_GET['state'] ?? '';

        $app = OauthApp::where('client_id', $clientId)->where('is_active', 1)->first();

        if (!$app) {
            throw new Exception("Приложението не е намерено.");
        }

        $code = bin2hex(random_bytes(20));

        OauthAuthCode::create([
            'user_id' => Auth::id(),
            'app_id' => $app->id,
            'code' => $code,
            'redirect_uri' => $redirectUri,
            'expires_at' => date('Y-m-d H:i:s', strtotime('+10 minutes'))
        ]);

        OauthConsent::updateOrCreate([
            'user_id' => Auth::id(),
            'app_id' => $app->id
        ]);

        $separator = (parse_url($redirectUri, PHP_URL_QUERY) == NULL) ? '?' : '&';
        $targetUrl = $redirectUri . $separator . http_build_query([
            'code' => $code,
            'state' => $state
        ]);

        $this->redirect($targetUrl);
    }

    public function token()
    {
        $grantType = $_POST['grant_type'] ?? '';
        $clientId = $_POST['client_id'] ?? '';
        $clientSecret = $_POST['client_secret'] ?? '';
        $code = $_POST['code'] ?? '';

        if ($grantType !== 'authorization_code') {
            return $this->json(['error' => 'unsupported_grant_type']);
        }

        $app = OauthApp::where('client_id', $clientId)
            ->where('client_secret', $clientSecret)
            ->where('is_active', 1)
            ->first();

        if (!$app) {
            return $this->json(['error' => 'invalid_client']);
        }

        $authCode = OauthAuthCode::where('code', $code)
            ->where('app_id', $app->id)
            ->first();

        if (!$authCode || !$authCode->isValid()) {
            return $this->json(['error' => 'invalid_grant']);
        }

        $inputRedirectUri = $_POST['redirect_uri'] ?? null;
        if ($authCode->redirect_uri !== $inputRedirectUri) {
            return $this->json(['error' => 'invalid_grant', 'message' => 'Redirect URI mismatch']);
        }

        $accessToken = bin2hex(random_bytes(40));

        OauthAccessToken::create([
            'token' => $accessToken,
            'user_id' => $authCode->user_id,
            'app_id' => $app->id,
            'expires_at' => date('Y-m-d H:i:s', strtotime('+1 hour'))
        ]);

        $authCode->delete();

        return $this->json([
            'access_token' => $accessToken,
            'token_type' => 'Bearer',
            'expires_in' => 3600
        ]);
    }

    public function me()
    {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        $token = null;

        if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            $token = $matches[1];
        }

        if (!$token) {
            return $this->json(['error' => 'missing_token'], 401);
        }

        $accessToken = OauthAccessToken::where('token', $token)->first();

        if (!$accessToken || $accessToken->isExpired()) {
            return $this->json(['error' => 'invalid_or_expired_token'], 401);
        }

        $user = $accessToken->user;

        return $this->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'avatar' => $user->avatar_url ?? null
        ]);
    }

    public function getUsers()
    {
        $users = User::all(['id', 'name', 'email', 'role']);

        return $this->json([
            'success' => true,
            'data' => $users
        ]);
    }
}