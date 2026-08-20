<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Exceptions\RealtimeCallNotActionableException;
use App\Models\OauthAccessToken;
use App\Models\User;
use App\Services\RealtimeNotifier;
use Illuminate\Support\Facades\Validator;

final class CallController extends BaseController
{
    public function action(string $callId)
    {
        $user = $this->authenticatedUser();
        if (!$user) {
            return $this->json(['success' => false, 'message' => 'Необходима е автентикация.'], 401);
        }

        if (!preg_match('/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/', $callId)) {
            return $this->json(['success' => false, 'message' => 'Невалиден call_id.'], 422);
        }

        $input = $this->jsonInput();
        $validator = Validator::make($input, ['action' => 'required|in:accept,reject']);
        if ($validator->fails()) {
            return $this->json(['success' => false, 'message' => $validator->errors()->first(), 'errors' => $validator->errors()->toArray()], 422);
        }

        try {
            $result = (new RealtimeNotifier())->forwardCallAction($callId, (int) $user->id, $input['action']);
        } catch (RealtimeCallNotActionableException $exception) {
            return $this->json(['success' => false, 'code' => 'CALL_NOT_ACTIONABLE'], 409);
        } catch (\Throwable $exception) {
            error_log('[CallAction] realtime_failed call_id=' . $callId . ' user_id=' . (int) $user->id);
            return $this->json(['success' => false, 'message' => 'Realtime услугата временно не е достъпна.'], 503);
        }

        if (empty($result['success']) || !in_array($result['status'] ?? null, ['accepted', 'rejected'], true)) {
            return $this->json(['success' => false, 'code' => 'CALL_NOT_ACTIONABLE'], 409);
        }

        return $this->json(['success' => true, 'call_id' => $callId, 'status' => $result['status']]);
    }

    private function authenticatedUser(): ?User
    {
        $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
        if (!preg_match('/Bearer\s+(\S+)/i', $authorization, $matches)) {
            return null;
        }
        $accessToken = OauthAccessToken::query()->where('token', $matches[1])->with('user')->first();
        return (!$accessToken || $accessToken->isExpired() || !$accessToken->user || !$accessToken->user->is_active)
            ? null : $accessToken->user;
    }

    private function jsonInput(): array
    {
        $input = json_decode(file_get_contents('php://input'), true);
        return is_array($input) ? $input : [];
    }
}
