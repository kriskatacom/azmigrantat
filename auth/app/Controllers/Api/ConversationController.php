<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\Conversation;
use App\Models\Participant;
use App\Models\User;
use App\Services\BlockService;
use App\Services\ConversationService;
use Exception;
use Illuminate\Support\Facades\Validator;

final class ConversationController extends BaseController
{
    private ConversationService $conversationService;
    private BlockService $blockService;

    public function __construct()
    {
        $this->conversationService = new ConversationService();
        $this->blockService = new BlockService();
    }

    public function index()
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        $conversations = $this->conversationService
            ->getUserConversations($user);

        $blockedIds = $this->blockService->relatedUserIds((int) $user->id);

        return $this->json([
            'success' => true,
            'data' => $conversations
                ->filter(function (Conversation $conversation) use ($user, $blockedIds) {
                    $otherUserId = $this->blockService->otherUserIdFor(
                        $conversation,
                        (int) $user->id
                    );

                    return $otherUserId === null
                        || !in_array($otherUserId, $blockedIds, true);
                })
                ->map(
                    fn(Conversation $conversation) =>
                    $this->serializeConversation(
                        $conversation,
                        (int) $user->id
                    )
                )
                ->values(),
        ]);
    }

    public function show($conversationId)
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
            return $this->json([
                'success' => false,
                'message' => 'Разговорът не е намерен или нямате достъп до него.',
            ], 404);
        }

        if ($this->blockService->isBlockedByOtherInConversation($conversation, (int) $user->id)) {
            return $this->json([
                'success' => false,
                'message' => 'Разговорът не е намерен или нямате достъп до него.',
            ], 404);
        }

        $conversation = $this->conversationService
            ->loadConversationDetails($conversation);

        return $this->json([
            'success' => true,
            'data' => $this->serializeConversation(
                $conversation,
                (int) $user->id
            ),
        ]);
    }

    public function createDirect()
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        $input = $this->jsonInput();

        $validator = Validator::make(
            $input,
            [
                'recipient_id' => 'required|integer',
            ],
            [
                'required' => 'Полето :attribute е задължително.',
                'integer' => 'Полето :attribute трябва да бъде число.',
            ],
            [
                'recipient_id' => 'получател',
            ]
        );

        if ($validator->fails()) {
            return $this->validationError($validator);
        }

        $recipientId = (int) $input['recipient_id'];

        if ($recipientId === (int) $user->id) {
            return $this->json([
                'success' => false,
                'message' => 'Не можете да създадете разговор със себе си.',
            ], 422);
        }

        $recipient = User::query()
            ->where('id', $recipientId)
            ->where('is_active', true)
            ->first();

        if (!$recipient) {
            return $this->json([
                'success' => false,
                'message' => 'Потребителят не е намерен или е неактивен.',
            ], 404);
        }

        if ($this->blockService->areBlocked((int) $user->id, $recipientId)) {
            return $this->json([
                'success' => false,
                'message' => 'Не можете да започнете разговор с блокиран потребител.',
            ], 403);
        }

        try {
            $conversation = $this->conversationService
                ->createDirectConversation($user, $recipient);

            return $this->json([
                'success' => true,
                'data' => $this->serializeConversation(
                    $conversation,
                    (int) $user->id
                ),
            ], 201);
        } catch (Exception $exception) {
            return $this->json([
                'success' => false,
                'message' => 'Разговорът не можа да бъде създаден.',
            ], 500);
        }
    }

    public function clear($conversationId)
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
            return $this->json([
                'success' => false,
                'message' => 'Разговорът не е намерен или нямате достъп до него.',
            ], 404);
        }

        $input = $this->jsonInput();

        $validator = Validator::make(
            $input,
            [
                'scope' => 'required|in:me,both',
                'messages' => 'required|in:mine,all',
            ],
            [
                'required' => 'Полето :attribute е задължително.',
                'in' => 'Полето :attribute е невалидно.',
            ],
            [
                'scope' => 'за кого',
                'messages' => 'съобщения',
            ]
        );

        if ($validator->fails()) {
            return $this->validationError($validator);
        }

        try {
            $result = $this->conversationService->clearConversation(
                $conversation,
                $user,
                (string) $input['scope'],
                (string) $input['messages']
            );

            return $this->json([
                'success' => true,
                'data' => $result,
            ]);
        } catch (Exception $exception) {
            return $this->json([
                'success' => false,
                'message' => 'Чатът не можа да бъде изтрит.',
            ], 500);
        }
    }

    public function unreadCount()
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        $unreadCount =
            $this->conversationService
                ->getUnreadCount($user);

        return $this->json([
            'success' => true,
            'data' => [
                'unread_count' => $unreadCount,
            ],
        ]);
    }

    private function serializeConversation(
        Conversation $conversation,
        int $currentUserId
    ): array {
        $participants = $conversation->participants;

        $otherParticipant = $participants
            ->where('user_id', '!=', $currentUserId)
            ->first();

        $currentParticipant = $participants
            ->firstWhere('user_id', $currentUserId);

        $lastReadMessageId = (int) (
            $currentParticipant?->last_read_message_id ?? 0
        );

        $unreadQuery = $conversation
            ->messages()
            ->where('id', '>', $lastReadMessageId)
            ->where('sender_id', '!=', $currentUserId)
            ->where('type', '!=', \App\Models\Message::TYPE_SYSTEM);

        $clearedBeforeId = (int) ($currentParticipant?->cleared_before_id ?? 0);
        if ($clearedBeforeId > 0) {
            $unreadQuery->where('id', '>', $clearedBeforeId);
        }

        $unreadCount = $unreadQuery->count();
        $lastMessage = $this->conversationService->visibleLastMessage(
            $conversation,
            $currentUserId
        );

        return [
            'id' => $conversation->id,
            'type' => $conversation->type,
            'title' => $conversation->isDirect()
                ? $otherParticipant?->user?->name
                : $conversation->title,
            'image' => $conversation->isDirect()
                ? $otherParticipant?->user?->profile_image_url
                : $conversation->image,
            'other_user' => $conversation->isDirect()
                ? $this->serializeUser($otherParticipant?->user)
                : null,
            'last_message' => $lastMessage
                ? MessageController::serializeMessage(
                    $lastMessage,
                    $currentUserId
                )
                : null,
            'last_read_message_id' =>
                $currentParticipant?->last_read_message_id,

            'unread_count' => $unreadCount,
            'is_blocked' => $this->blockService->isBlockedInConversation(
                $conversation,
                $currentUserId
            ),
            'is_muted' => (bool) (
                $currentParticipant?->is_muted ?? false
            ),
            'is_archived' => (bool) (
                $currentParticipant?->is_archived ?? false
            ),
            'updated_at' =>
                $conversation->updated_at?->toISOString(),
        ];
    }

    private function serializeUser(?User $user): ?array
    {
        if (!$user) {
            return null;
        }

        return $user->toChatUserArray();
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
}