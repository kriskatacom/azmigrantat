<?php

namespace App\Core;

use App\Models\SessionModel;
use SessionHandlerInterface;

class DatabaseSessionHandler implements SessionHandlerInterface
{
    public function open($path, $name): bool
    {
        return true;
    }

    public function close(): bool
    {
        return true;
    }

    public function read($id): string|false
    {
        $session = SessionModel::find($id);
        return $session ? base64_decode($session->payload) : '';
    }

    public function write($id, $data): bool
    {
        $userId = $_SESSION['user_id'] ?? null;
        $ip = $_SERVER['REMOTE_ADDR'] ?? null;
        $agent = $_SERVER['HTTP_USER_AGENT'] ?? null;

        SessionModel::updateOrCreate(
            ['id' => $id],
            [
                'user_id' => $userId,
                'ip_address' => $ip,
                'user_agent' => $agent,
                'payload' => base64_encode($data),
                'last_activity' => time()
            ]
        );

        return true;
    }

    public function destroy($id): bool
    {
        SessionModel::destroy($id);
        return true;
    }

    public function gc($max_lifetime): int|false
    {
        $threshold = time() - $max_lifetime;
        return SessionModel::where('last_activity', '<', $threshold)->delete();
    }
}