<?php

namespace App\Services;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\MessageReaction;
use App\Models\User;
use App\Repositories\ConversationRepository;
use App\Repositories\MessageRepository;
use App\Services\RealtimeNotifier;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;

final class ConversationService
{
    private ConversationRepository $conversationRepository;
    private MessageRepository $messageRepository;
    private RealtimeNotifier $realtimeNotifier;

    public function __construct()
    {
        $this->conversationRepository = new ConversationRepository();
        $this->messageRepository = new MessageRepository();
        $this->realtimeNotifier = new RealtimeNotifier();
    }

    public function getUserConversations(User $user): Collection
    {
        return $this->conversationRepository->getForUser($user);
    }

    public function createDirectConversation(
        User $user,
        User $recipient
    ): Conversation {
        $directKey = Conversation::makeDirectKey(
            (int) $user->id,
            (int) $recipient->id
        );

        $connection = (new Conversation())->getConnection();

        return $connection->transaction(
            function () use ($user, $recipient, $directKey) {
                $conversation =
                    $this->conversationRepository->findDirectByKey(
                        $directKey
                    );

                if (!$conversation) {
                    $conversation =
                        $this->conversationRepository->createDirect(
                            $user,
                            $directKey
                        );
                }

                $this->conversationRepository->addParticipant(
                    $conversation,
                    $user
                );

                $this->conversationRepository->addParticipant(
                    $conversation,
                    $recipient
                );

                return $this->conversationRepository->loadDetails(
                    $conversation
                );
            }
        );
    }

    public function findUserConversation(
        int $conversationId,
        int $userId
    ): ?Conversation {
        return $this->conversationRepository->findForUser(
            $conversationId,
            $userId
        );
    }

    public function getMessages(
        Conversation $conversation,
        int $limit = 30,
        ?int $beforeId = null
    ): array {
        return $this->messageRepository->getForConversation(
            $conversation,
            $limit,
            $beforeId
        );
    }

    public function sendMessage(
        Conversation $conversation,
        User $sender,
        string $clientMessageId,
        ?string $content,
        string $type = 'text',
        ?array $metadata = null
    ): Message {
        $existingMessage =
            $this->messageRepository->findByClientMessageId(
                (int) $sender->id,
                $clientMessageId
            );

        if ($existingMessage) {
            return $existingMessage;
        }

        $normalizedContent = $content !== null
            ? trim($content)
            : null;

        if (
            $type === 'text' &&
            ($normalizedContent === null || $normalizedContent === '')
        ) {
            throw new \InvalidArgumentException(
                'Съобщението не може да бъде празно.'
            );
        }

        if (
            $type !== 'text' &&
            ($metadata === null || empty($metadata['url']))
        ) {
            throw new \InvalidArgumentException(
                'Липсват данни за прикачения файл.'
            );
        }

        $connection = (new Message())->getConnection();

        $message = $connection->transaction(
            function () use ($conversation, $sender, $clientMessageId, $normalizedContent, $type, $metadata) {
                $message = $this->messageRepository->createMessage(
                    $conversation,
                    $sender,
                    $clientMessageId,
                    $normalizedContent,
                    $type,
                    $metadata
                );

                $this->conversationRepository->updateLastMessage(
                    $conversation,
                    (int) $message->id
                );

                return $message;
            }
        );

        $this->realtimeNotifier->notifyNewMessage(
            $message,
            $conversation
        );

        return $message;
    }

    public function recordCallEvent(
        Conversation $conversation,
        User $caller,
        array $metadata
    ): Message {
        $callId = trim((string) ($metadata['call_id'] ?? ''));

        if ($callId === '') {
            throw new \InvalidArgumentException('Липсва call_id.');
        }

        $existingMessage = $this->messageRepository->findByClientMessageId(
            (int) $caller->id,
            $callId
        );

        if ($existingMessage) {
            return $existingMessage;
        }

        $content = $this->callEventPreview($metadata);

        $connection = (new Message())->getConnection();

        $message = $connection->transaction(
            function () use ($conversation, $caller, $callId, $content, $metadata) {
                $message = $this->messageRepository->createMessage(
                    $conversation,
                    $caller,
                    $callId,
                    $content,
                    Message::TYPE_SYSTEM,
                    $metadata
                );

                $this->conversationRepository->updateLastMessage(
                    $conversation,
                    (int) $message->id
                );

                return $message;
            }
        );

        $this->realtimeNotifier->notifyNewMessage(
            $message,
            $conversation
        );

        return $message;
    }

    private function callEventPreview(array $metadata): string
    {
        $isVideo = ($metadata['call_type'] ?? '') === 'video';
        $kind = $isVideo ? 'Видео обаждане' : 'Аудио обаждане';
        $outcome = (string) ($metadata['outcome'] ?? '');
        $duration = (int) ($metadata['duration_seconds'] ?? 0);

        return match ($outcome) {
            'completed' => $duration > 0
                ? $kind . ' · ' . $this->formatCallDuration($duration)
                : $kind,
            'rejected' => 'Отхвърлено ' . mb_strtolower($kind),
            'cancelled' => 'Отменено ' . mb_strtolower($kind),
            'unanswered' => $kind . ' без отговор',
            default => 'Пропуснато ' . mb_strtolower($kind),
        };
    }

    private function formatCallDuration(int $seconds): string
    {
        $seconds = max(0, $seconds);
        $hours = intdiv($seconds, 3600);
        $minutes = intdiv($seconds % 3600, 60);
        $rest = $seconds % 60;

        if ($hours > 0) {
            return sprintf('%d:%02d:%02d', $hours, $minutes, $rest);
        }

        return sprintf('%d:%02d', $minutes, $rest);
    }

    public function markConversationAsRead(
        Conversation $conversation,
        User $user,
        ?int $messageId = null
    ): ?Message {
        $message = $this->messageRepository->findInConversation(
            (int) $conversation->id,
            $messageId
        );

        if (!$message) {
            return null;
        }

        $participant =
            $this->conversationRepository->findParticipant(
                (int) $conversation->id,
                (int) $user->id
            );

        if (!$participant) {
            return null;
        }

        $readAt = Carbon::now();

        $participant->update([
            'last_read_message_id' => $message->id,
            'last_read_at' => $readAt,
        ]);

        $this->messageRepository->markAsReadUntil(
            (int) $conversation->id,
            (int) $user->id,
            (int) $message->id,
            $readAt
        );

        return $message;
    }

    public function markConversationAsDelivered(
        Conversation $conversation,
        User $user,
        ?int $messageId = null
    ): ?array {
        $message = $this->messageRepository->findInConversation(
            (int) $conversation->id,
            $messageId
        );

        if (!$message) {
            return null;
        }

        $participant =
            $this->conversationRepository->findParticipant(
                (int) $conversation->id,
                (int) $user->id
            );

        if (!$participant) {
            return null;
        }

        $deliveredAt = Carbon::now();
        $updated = $this->messageRepository->markAsDeliveredUntil(
            (int) $conversation->id,
            (int) $user->id,
            (int) $message->id,
            $deliveredAt
        );

        return [
            'message' => $message,
            'updated' => $updated,
            'delivered_at' => $deliveredAt,
        ];
    }

    public function toggleMessageReaction(
        Conversation $conversation,
        User $user,
        int $messageId,
        string $type
    ): ?array {
        $message = Message::query()
            ->where('conversation_id', $conversation->id)
            ->where('id', $messageId)
            ->first();

        if (!$message || $message->type === Message::TYPE_SYSTEM) {
            return null;
        }

        $existing = MessageReaction::query()
            ->where('message_id', $message->id)
            ->where('user_id', $user->id)
            ->first();

        $currentType = $type;

        if ($existing && $existing->type === $type) {
            $existing->delete();
            $currentType = null;
        } else {
            MessageReaction::query()->updateOrCreate(
                [
                    'message_id' => $message->id,
                    'user_id' => $user->id,
                ],
                [
                    'type' => $type,
                ]
            );
        }

        $message->load('reactions');
        $summary = MessageReaction::summarize($message->reactions);

        return [
            'message' => $message,
            'type' => $currentType,
            'items' => $summary['items'],
        ];
    }

    public function loadConversationDetails(
        Conversation $conversation
    ): Conversation {
        return $this->conversationRepository
            ->loadDetails($conversation);
    }

    public function getUnreadCount(
        User $user
    ): int {
        $conversations =
            $this->conversationRepository
                ->getForUser($user);

        $conversationIds = $conversations
            ->pluck('id')
            ->map(
                fn($id) => (int) $id
            )
            ->values()
            ->all();

        return $this->messageRepository
            ->countUnreadForUser(
                $user,
                $conversationIds
            );
    }
}