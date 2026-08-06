<?php

namespace App\Services;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\Participant;
use RuntimeException;
use Throwable;

final class RealtimeNotifier
{
    private string $realtimeUrl;
    private string $internalSecret;
    private int $timeoutSeconds;

    public function __construct()
    {
        $this->realtimeUrl = rtrim(
            (string) ($_ENV['REALTIME_SERVER_URL'] ?? getenv('REALTIME_SERVER_URL')),
            '/'
        );

        $this->internalSecret = (string) (
            $_ENV['REALTIME_INTERNAL_SECRET']
            ?? getenv('REALTIME_INTERNAL_SECRET')
        );

        $this->timeoutSeconds = 5;

        if ($this->realtimeUrl === '') {
            throw new RuntimeException(
                'Липсва REALTIME_SERVER_URL в environment настройките.'
            );
        }

        if ($this->internalSecret === '') {
            throw new RuntimeException(
                'Липсва REALTIME_INTERNAL_SECRET в environment настройките.'
            );
        }
    }

    public function notifyNewMessage(
        Message $message,
        Conversation $conversation
    ): bool {
        $recipientIds = Participant::query()
            ->where('conversation_id', $conversation->id)
            ->where('user_id', '!=', $message->sender_id)
            ->whereNull('left_at')
            ->pluck('user_id')
            ->map(static fn($userId): int => (int) $userId)
            ->values()
            ->all();

        if ($recipientIds === []) {
            return false;
        }

        $message->loadMissing('sender');

        return $this->send('/internal/events/message', [
            'recipient_ids' => $recipientIds,
            'message' => [
                'id' => (int) $message->id,
                'conversation_id' => (int) $message->conversation_id,
                'sender_id' => (int) $message->sender_id,
                'client_message_id' => $message->client_message_id,
                'type' => $message->type,
                'content' => $message->content,
                'metadata' => $message->metadata,
                'status' => $message->status,
                'delivered_at' => $message->delivered_at?->toISOString(),
                'read_at' => $message->read_at?->toISOString(),
                'edited_at' => $message->edited_at?->toISOString(),
                'created_at' => $message->created_at?->toISOString(),
                'sender' => $message->sender
                    ? [
                        'id' => (int) $message->sender->id,
                        'name' => $message->sender->name,
                        'email' => $message->sender->email,
                        'username' => $message->sender->username,
                        'role' => $message->sender->role,
                        'profile_image' =>
                            $message->sender->profile_image
                            ?? $message->sender->avatar
                            ?? null,
                        'is_active' => (bool) $message->sender->is_active,
                    ]
                    : null,
            ],
        ]);
    }

    private function send(string $endpoint, array $payload): bool
    {
        $url = $this->realtimeUrl . $endpoint;
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE);

        if ($json === false) {
            throw new RuntimeException(
                'Realtime payload-ът не можа да бъде преобразуван в JSON.'
            );
        }

        $curl = curl_init($url);

        if ($curl === false) {
            throw new RuntimeException(
                'Неуспешно инициализиране на cURL.'
            );
        }

        curl_setopt_array($curl, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => $this->timeoutSeconds,
            CURLOPT_TIMEOUT => $this->timeoutSeconds,
            CURLOPT_HTTPHEADER => [
                'Accept: application/json',
                'Content-Type: application/json',
                'X-Internal-Secret: ' . $this->internalSecret,
            ],
            CURLOPT_POSTFIELDS => $json,
        ]);

        try {
            $responseBody = curl_exec($curl);

            if ($responseBody === false) {
                throw new RuntimeException(
                    'Грешка при връзката с realtime сървъра: '
                    . curl_error($curl)
                );
            }

            $statusCode = (int) curl_getinfo(
                $curl,
                CURLINFO_HTTP_CODE
            );

            if ($statusCode < 200 || $statusCode >= 300) {
                throw new RuntimeException(
                    sprintf(
                        'Realtime сървърът върна HTTP %d: %s',
                        $statusCode,
                        mb_substr((string) $responseBody, 0, 500)
                    )
                );
            }

            return true;
        } catch (Throwable $exception) {
            error_log(
                '[RealtimeNotifier] ' . $exception->getMessage()
            );

            return false;
        } finally {
            curl_close($curl);
        }
    }

    public function notifyMessageRead(
        Conversation $conversation,
        int $readerId,
        int $lastReadMessageId,
        string $readAt
    ): bool {
        $recipientIds = Participant::query()
            ->where('conversation_id', $conversation->id)
            ->where('user_id', '!=', $readerId)
            ->whereNull('left_at')
            ->pluck('user_id')
            ->map(static fn($userId): int => (int) $userId)
            ->values()
            ->all();

        if ($recipientIds === []) {
            return false;
        }

        return $this->send('/internal/events/message-read', [
            'recipient_ids' => $recipientIds,
            'conversation_id' => (int) $conversation->id,
            'reader_id' => $readerId,
            'last_read_message_id' => $lastReadMessageId,
            'read_at' => $readAt,
        ]);
    }
}