<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\Message;
use App\Models\OauthAccessToken;
use App\Models\User;
use App\Services\ConversationService;
use App\Services\PushNotificationService;
use App\Services\RealtimeNotifier;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\Validator;

final class MessageController extends BaseController
{
    private ConversationService $conversationService;
    private RealtimeNotifier $realtimeNotifier;
    private PushNotificationService $pushNotificationService;

    public function __construct()
    {
        $this->conversationService = new ConversationService();
        $this->realtimeNotifier = new RealtimeNotifier();
        $this->pushNotificationService = new PushNotificationService();
    }

    public function index($conversationId)
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        $conversation = $this->conversationService
            ->findUserConversation(
                (int) $conversationId,
                (int) $user->id
            );

        if (!$conversation) {
            return $this->conversationNotFound();
        }

        $limit = (int) ($_GET['limit'] ?? 30);

        $beforeId = isset($_GET['before_id'])
            ? (int) $_GET['before_id']
            : null;

        $result = $this->conversationService->getMessages(
            $conversation,
            $limit,
            $beforeId
        );

        return $this->json([
            'success' => true,
            'data' => $result['messages']
                ->map(
                    fn(Message $message) =>
                    self::serializeMessage($message)
                )
                ->values(),
            'meta' => [
                'has_more' => $result['has_more'],
                'next_before_id' =>
                    $result['next_before_id'],
            ],
        ]);
    }

    public function store($conversationId)
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        $conversation = $this->conversationService
            ->findUserConversation(
                (int) $conversationId,
                (int) $user->id
            );

        if (!$conversation) {
            return $this->conversationNotFound();
        }

        $input = $this->jsonInput();

        $validator = Validator::make(
            $input,
            [
                'client_message_id' =>
                    'required|string|max:36',

                'content' =>
                    'required|string|max:10000',
            ],
            [
                'required' =>
                    'Полето :attribute е задължително.',

                'string' =>
                    'Полето :attribute трябва да бъде текст.',

                'max' =>
                    'Полето :attribute не може да съдържа повече от :max символа.',
            ],
            [
                'client_message_id' =>
                    'идентификатор на съобщението',

                'content' =>
                    'съобщение',
            ]
        );

        if ($validator->fails()) {
            return $this->validationError($validator);
        }

        $content = trim($input['content']);

        if ($content === '') {
            return $this->json([
                'success' => false,
                'message' => 'Съобщението не може да бъде празно.',
            ], 422);
        }

        try {
            $message = $this->conversationService
                ->sendMessage(
                    $conversation,
                    $user,
                    $input['client_message_id'],
                    $content
                );

            try {
                $this->pushNotificationService
                    ->sendMessageNotification(
                        $conversation,
                        $message,
                        $user
                    );
            } catch (Exception $exception) {
                error_log(
                    'Push notification error: '
                    . $exception->getMessage()
                );
            }

            return $this->json([
                'success' => true,
                'data' => self::serializeMessage($message),
            ], 201);
        } catch (Exception $exception) {
            return $this->json([
                'success' => false,
                'message' =>
                    'Съобщението не можа да бъде изпратено.',
            ], 500);
        }
    }

    public function markAsRead($conversationId)
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        $conversation = $this->conversationService
            ->findUserConversation(
                (int) $conversationId,
                (int) $user->id
            );

        if (!$conversation) {
            return $this->conversationNotFound();
        }

        $input = $this->jsonInput();

        $messageId = isset($input['message_id'])
            ? (int) $input['message_id']
            : null;

        $message = $this->conversationService
            ->markConversationAsRead(
                $conversation,
                $user,
                $messageId
            );

        if (!$message) {
            return $this->json([
                'success' => false,
                'message' => 'Съобщението не е намерено.',
            ], 404);
        }

        $this->realtimeNotifier->notifyMessageRead(
            $conversation,
            (int) $user->id,
            (int) $message->id,
            Carbon::now()->toISOString()
        );

        return $this->json([
            'success' => true,
            'message' =>
                'Съобщенията са отбелязани като прочетени.',
            'last_read_message_id' => $message->id,
        ]);
    }

    public static function serializeMessage(
        Message $message
    ): array {
        return [
            'id' => $message->id,
            'conversation_id' =>
                $message->conversation_id,
            'sender_id' => $message->sender_id,
            'client_message_id' =>
                $message->client_message_id,
            'type' => $message->type,
            'content' => $message->content,
            'metadata' => $message->metadata,
            'status' => $message->status,
            'delivered_at' =>
                $message->delivered_at?->toISOString(),
            'read_at' =>
                $message->read_at?->toISOString(),
            'edited_at' =>
                $message->edited_at?->toISOString(),
            'created_at' =>
                $message->created_at?->toISOString(),
            'sender' => self::serializeUser(
                $message->sender
            ),
        ];
    }

    private static function serializeUser(
        ?User $user
    ): ?array {
        if (!$user) {
            return null;
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'profile_image' => $user->profile_image,
            'is_active' => (bool) $user->is_active,
        ];
    }

    private function authenticatedUser(): ?User
    {
        $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

        if (!preg_match('/Bearer\s+(\S+)/i', $authorization, $matches)) {
            return null;
        }

        $accessToken = OauthAccessToken::query()
            ->where('token', $matches[1])
            ->with('user')
            ->first();

        if (
            !$accessToken ||
            $accessToken->isExpired() ||
            !$accessToken->user ||
            !$accessToken->user->is_active
        ) {
            return null;
        }

        return $accessToken->user;
    }

    private function jsonInput(): array
    {
        $input = json_decode(
            file_get_contents('php://input'),
            true
        );

        return is_array($input) ? $input : [];
    }

    private function validationError($validator)
    {
        return $this->json([
            'success' => false,
            'message' => $validator->errors()->first(),
            'errors' => $validator->errors()->toArray(),
        ], 422);
    }

    private function unauthorized()
    {
        return $this->json([
            'success' => false,
            'message' => 'Необходима е автентикация.',
        ], 401);
    }

    private function conversationNotFound()
    {
        return $this->json([
            'success' => false,
            'message' =>
                'Разговорът не е намерен или нямате достъп до него.',
        ], 404);
    }
}
