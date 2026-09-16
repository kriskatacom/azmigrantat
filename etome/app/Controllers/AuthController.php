<?php

namespace App\Controllers;

use App\Core\Session;

class AuthController extends BaseController
{
    public function redirectToProvider()
    {
        $state = bin2hex(random_bytes(16));
        $_SESSION['oauth_state'] = $state;

        $params = http_build_query([
            'client_id' => $_ENV['OAUTH_CLIENT_ID'],
            'redirect_uri' => $_ENV['OAUTH_REDIRECT_URI'],
            'state' => $state,
            'response_type' => 'code'
        ]);

        return header("Location: " . $_ENV['OAUTH_SERVER_URL'] . '/oauth/authorize?' . $params);
    }

    public function callback()
    {
        if (!isset($_GET['state']) || $_GET['state'] !== ($_SESSION['oauth_state'] ?? null)) {
            Session::setFlash('error', 'Невалидна сесия.');
            return $this->redirect('/users/login');
        }
        unset($_SESSION['oauth_state']);

        $postData = [
            'client_id' => $_ENV['OAUTH_CLIENT_ID'],
            'client_secret' => $_ENV['OAUTH_CLIENT_SECRET'],
            'redirect_uri' => $_ENV['OAUTH_REDIRECT_URI'],
            'code' => $_GET['code'] ?? '',
            'grant_type' => 'authorization_code'
        ];

        $ch = curl_init($_ENV['OAUTH_SERVER_URL'] . '/oauth/token');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $data = json_decode($response, true);

        if ($httpCode !== 200 || !isset($data['access_token'])) {
            Session::setFlash('error', 'Грешка при автентикация.');
            return $this->redirect('/users/login');
        }

        $_SESSION['access_token'] = $data['access_token'];

        return $this->fetchUserProfile($data['access_token']);
    }

    private function fetchUserProfile($token)
    {
        $ch = curl_init($_ENV['OAUTH_SERVER_URL'] . '/api/user/me');
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $token,
            'Accept: application/json'
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $userData = json_decode($response, true);

        if ($httpCode !== 200 || !isset($userData['email'])) {
            Session::setFlash('error', 'Грешка при извличане на профила.');
            return $this->redirect('/users/login');
        }

        $_SESSION['user'] = $userData;

        $baseUrl = rtrim($_ENV['OAUTH_SERVER_URL'], '/');
        return $this->redirect($baseUrl . '/users/profile');
    }

    public function logout()
    {
        session_destroy();
        return $this->redirect('/');
    }
}