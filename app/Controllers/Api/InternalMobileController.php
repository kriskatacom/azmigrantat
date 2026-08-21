<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\Conversation;
use App\Models\Notification;
use App\Models\User;
use App\Services\CallAuthorizationService;
use App\Services\ConversationService;
use App\Services\NotificationService;
use App\Services\PushNotificationService;
use App\Services\PushTokenService;
use App\Services\RealtimeNotifier;
use Illuminate\Support\Facades\Validator;

final class InternalMobileController extends BaseController
{
    private PushTokenService $pushTokens;
    private CallAuthorizationService $callAuthorization;
    private NotificationService $notifications;
    private ConversationService $conversations;
    private PushNotificationService $pushNotifications;
    private ?RealtimeNotifier $realtimeNotifier = null;

    public function __construct()
    {
        $this->pushTokens = new PushTokenService();
        $this->callAuthorization = new CallAuthorizationService();
        $this->notifications = new NotificationService();
        $this->conversations = new ConversationService();
        $this->pushNotifications = new PushNotificationService();
    }

    public function pushTokens()
    {
        if (!$this->hasValidInternalSecret()) {
            return $this->json(['success' => false, 'message' => 'Unauthorized.'], 401);
        }

        $validator = Validator::make($_GET, ['user_id' => 'required|integer|min:1']);
        if ($validator->fails()) {
            return $this->validationError($validator);
        }

        try {
            return $this->json([
                'success' => true,
                'tokens' => $this->pushTokens->getActiveFcmTokensForUser((int) $_GET['user_id']),
            ]);
        } catch (\Throwable $exception) {
            error_log('[InternalPushToken] lookup_failed user_id=' . (int) $_GET['user_id']);
            return $this->json(['success' => false, 'message' => 'Internal service error.'], 500);
        }
    }

    public function authorizeCall()
    {
        if (!$this->hasValidInternalSecret()) {
            return $this->json(['success' => false, 'message' => 'Unauthorized.'], 401);
        }

        $input = $this->jsonInput();
        $validator = Validator::make($input, [
            'caller_id' => 'required|integer|min:1',
            'recipient_id' => 'required|integer|min:1',
        ]);
        if ($validator->fails()) {
            return $this->validationError($validator);
        }

        try {
            return $this->json(['success' => true] + $this->callAuthorization->authorize(
                (int) $input['caller_id'], (int) $input['recipient_id']
            ));
        } catch (\Throwable $exception) {
            error_log('[InternalCallAuthorization] failed caller_id=' . (int) $input['caller_id'] . ' recipient_id=' . (int) $input['recipient_id']);
            return $this->json(['success' => false, 'message' => 'Internal service error.'], 500);
        }
    }

    public function deactivatePushToken()
    {
        if (!$this->hasValidInternalSecret()) {
            return $this->json(['success' => false, 'message' => 'Unauthorized.'], 401);
        }

        $input = $this->jsonInput();
        $validator = Validator::make($input, [
            'token' => 'required|string|max:255',
            'provider' => 'required|in:fcm',
            'reason' => 'required|string|max:255',
        ]);
        if ($validator->fails()) {
            return $this->validationError($validator);
        }

        $this->pushTokens->deactivateByProvider(trim($input['token']), $input['provider'], trim($input['reason']));
        return $this->json(['success' => true]);
    }

    public function missedVideoCall()
    {
        if (!$this->hasValidInternalSecret()) {
            return $this->json(['success' => false, 'message' => 'Unauthorized.'], 401);
        }

        $input = $this->jsonInput();
        $validator = Validator::make($input, [
            'recipient_id' => 'required|integer|min:1',
            'caller_id' => 'required|integer|min:1',
            'call_id' => 'required|string|max:128',
            'caller_name' => 'nullable|string|max:255',
            'caller_avatar' => 'nullable|string|max:2048',
            'conversation_id' => 'nullable|integer|min:1',
        ]);
        if ($validator->fails()) {
            return $this->validationError($validator);
        }

        try {
            $result = $this->notifications->recordMissedVideoCall(
                (int) $input['recipient_id'],
                (int) $input['caller_id'],
                trim($input['call_id']),
                isset($input['caller_name']) ? trim((string) $input['caller_name']) : null,
                isset($input['caller_avatar']) ? trim((string) $input['caller_avatar']) : null,
                isset($input['conversation_id']) ? (int) $input['conversation_id'] : null
            );
        } catch (\Throwable $exception) {
            error_log('[InternalMissedVideoCall] failed call_id=' . trim((string) ($input['call_id'] ?? '')));
            return $this->json(['success' => false, 'message' => 'Internal service error.'], 500);
        }

        $payload = $this->notifications->serialize($result['notification']);

        if (!$result['duplicate'] && $payload) {
            $this->dispatchNotification(
                (int) $input['recipient_id'],
                $payload,
                $result['created'] ? 'notification:new' : 'notification:updated'
            );
        }

        return $this->json([
            'success' => true,
            'duplicate' => $result['duplicate'],
            'created' => $result['created'],
            'updated' => $result['updated'],
            'notification' => $payload,
        ]);
    }

    public function recordCallLog()
    {
        if (!$this->hasValidInternalSecret()) {
            return $this->json(['success' => false, 'message' => 'Unauthorized.'], 401);
        }

        $input = $this->jsonInput();
        $validator = Validator::make($input, [
            'call_id' => 'required|string|max:128',
            'caller_id' => 'required|integer|min:1',
            'recipient_id' => 'required|integer|min:1',
            'call_type' => 'required|in:audio,video',
            'outcome' => 'required|in:completed,missed,rejected,cancelled,unanswered',
            'started_at' => 'required|date',
            'ended_at' => 'required|date',
            'answered_at' => 'nullable|date',
            'duration_seconds' => 'nullable|integer|min:0',
            'ended_by_id' => 'nullable|integer|min:1',
            'reason' => 'nullable|string|max:64',
            'camera_enabled' => 'nullable|boolean',
            'conversation_id' => 'nullable|integer|min:1',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator);
        }

        $callerId = (int) $input['caller_id'];
        $recipientId = (int) $input['recipient_id'];

        $conversation = null;
        if (isset($input['conversation_id'])) {
            $conversation = Conversation::query()
                ->where('id', (int) $input['conversation_id'])
                ->where('is_active', true)
                ->first();
        }

        if (!$conversation) {
            $conversation = Conversation::query()
                ->where('type', 'direct')
                ->where('direct_key', Conversation::makeDirectKey($callerId, $recipientId))
                ->where('is_active', true)
                ->first();
        }

        if (!$conversation) {
            return $this->json([
                'success' => false,
                'message' => 'Разговорът не е намерен.',
            ], 404);
        }

        $users = User::query()
            ->whereIn('id', array_filter([
                $callerId,
                $recipientId,
                isset($input['ended_by_id']) ? (int) $input['ended_by_id'] : null,
            ]))
            ->get()
            ->keyBy('id');

        $caller = $users->get($callerId);
        $recipient = $users->get($recipientId);

        if (!$caller || !$recipient) {
            return $this->json([
                'success' => false,
                'message' => 'Участникът в обаждането не е намерен.',
            ], 404);
        }

        $endedById = isset($input['ended_by_id']) ? (int) $input['ended_by_id'] : null;
        $endedBy = $endedById ? $users->get($endedById) : null;
        $duration = (int) ($input['duration_seconds'] ?? 0);

        $metadata = [
            'kind' => 'call',
            'call_id' => trim((string) $input['call_id']),
            'call_type' => $input['call_type'],
            'outcome' => $input['outcome'],
            'caller_id' => $callerId,
            'caller_name' => (string) $caller->name,
            'recipient_id' => $recipientId,
            'recipient_name' => (string) $recipient->name,
            'started_at' => $input['started_at'],
            'answered_at' => $input['answered_at'] ?? null,
            'ended_at' => $input['ended_at'],
            'duration_seconds' => $duration,
            'ended_by_id' => $endedById,
            'ended_by_name' => $endedBy?->name,
            'reason' => $input['reason'] ?? null,
            'camera_enabled' => (bool) ($input['camera_enabled'] ?? ($input['call_type'] === 'video')),
        ];

        try {
            $message = $this->conversations->recordCallEvent(
                $conversation,
                $caller,
                $metadata
            );
        } catch (\Throwable $exception) {
            error_log('[InternalCallLog] failed call_id=' . trim((string) $input['call_id']));
            return $this->json(['success' => false, 'message' => 'Internal service error.'], 500);
        }

        return $this->json([
            'success' => true,
            'message_id' => (int) $message->id,
        ]);
    }

    public function createNotification()
    {
        if (!$this->hasValidInternalSecret()) {
            return $this->json(['success' => false, 'message' => 'Unauthorized.'], 401);
        }

        $input = $this->jsonInput();
        $validator = Validator::make($input, [
            'user_id' => 'required|integer|min:1',
            'type' => 'required|string|max:64',
            'title' => 'nullable|string|max:255',
            'message' => 'nullable|string|max:5000',
            'actor_id' => 'nullable|integer|min:1',
            'entity_id' => 'nullable|string|max:128',
            'data' => 'nullable|array',
            'count' => 'nullable|integer|min:1',
        ]);
        if ($validator->fails()) {
            return $this->validationError($validator);
        }

        try {
            $notification = $this->notifications->create($input);
        } catch (\Throwable $exception) {
            error_log('[InternalNotification] create_failed user_id=' . (int) $input['user_id']);
            return $this->json(['success' => false, 'message' => 'Internal service error.'], 500);
        }

        $payload = $this->notifications->serialize($notification);
        $this->dispatchNotification((int) $input['user_id'], $payload, 'notification:new');

        return $this->json([
            'success' => true,
            'created' => true,
            'notification' => $payload,
        ], 201);
    }

    private function dispatchNotification(int $userId, ?array $payload, string $event): void
    {
        if (!$payload) {
            return;
        }

        $user = User::query()->find($userId);
        if ($user) {
            $type = (string) $payload['type'];
            $notificationData = is_array($payload['data'] ?? null) ? $payload['data'] : [];
            $conversationId = $notificationData['conversation_id'] ?? null;
            $callerAvatar = $payload['actor']['profile_image']
                ?? $notificationData['caller_avatar']
                ?? null;
            $pushData = [
                'type' => $type,
                'notification_id' => (string) $payload['id'],
                'caller_id' => isset($payload['actor_id']) ? (string) $payload['actor_id'] : '',
                'call_id' => (string) ($payload['entity_id'] ?? ''),
                'count' => (string) $payload['count'],
            ];

            if ($conversationId !== null && $conversationId !== '') {
                $pushData['conversation_id'] = (string) $conversationId;
            }

            if (!empty($payload['title'])) {
                $pushData['caller_name'] = (string) $payload['title'];
            }

            if (is_string($callerAvatar) && $callerAvatar !== '') {
                $pushData['caller_avatar'] = $callerAvatar;
            }

            $this->pushNotifications->sendToUser(
                $user,
                (string) ($payload['title'] ?: 'Известие'),
                (string) ($payload['message'] ?: 'Имате ново известие.'),
                $pushData,
                is_string($callerAvatar) && $callerAvatar !== '' ? $callerAvatar : null,
                $type === Notification::TYPE_MISSED_VIDEO_CALL ? 'missed_call' : 'chat_message'
            );
        }

        try {
            $this->realtime()->notifyNotification($userId, $payload, $event);
        } catch (\Throwable $exception) {
            error_log('[InternalNotification] realtime_failed user_id=' . $userId);
        }
    }

    private function realtime(): RealtimeNotifier
    {
        return $this->realtimeNotifier ??= new RealtimeNotifier();
    }

    private function hasValidInternalSecret(): bool
    {
        $expected = (string) ($_ENV['REALTIME_INTERNAL_SECRET'] ?? getenv('REALTIME_INTERNAL_SECRET'));
        $provided = (string) ($_SERVER['HTTP_X_INTERNAL_SECRET'] ?? '');
        return $expected !== '' && $provided !== '' && hash_equals($expected, $provided);
    }

    private function jsonInput(): array
    {
        $input = json_decode(file_get_contents('php://input'), true);
        return is_array($input) ? $input : [];
    }

    private function validationError($validator)
    {
        return $this->json(['success' => false, 'message' => $validator->errors()->first(), 'errors' => $validator->errors()->toArray()], 422);
    }
}
