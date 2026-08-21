<?php

namespace App\Services;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\PushToken;
use App\Models\User;
use Exception;

final class PushNotificationService
{
    private const EXPO_PUSH_URL =
        'https://exp.host/--/api/v2/push/send';

    public function sendMessageNotification(
        Conversation $conversation,
        Message $message,
        User $sender
    ): bool {
        $recipientParticipant = $conversation
            ->participants()
            ->where(
                'user_id',
                '!=',
                (int) $sender->id
            )
            ->whereNull('left_at')
            ->with('user')
            ->first();

        $recipient = $recipientParticipant?->user;

        if (!$recipient) {
            return false;
        }

        $body = trim((string) $message->content);

        if ($body === '') {
            $body = 'Ново съобщение';
        }

        $senderImage = $sender->options['profile_image'] ?? null;

        return $this->sendToUser(
            $recipient,
            (string) $sender->name,
            $body,
            [
                'type' => 'chat_message',
                'conversation_id' => (int) $conversation->id,
                'message_id' => (int) $message->id,
                'sender_id' => (int) $sender->id,
                'sender_image' => $senderImage,
            ],
            $senderImage
        );
    }

    public function sendToUser(
        User $user,
        string $title,
        string $body,
        array $data = [],
        ?string $imageUrl = null,
        string $categoryId = 'chat_message'
    ): bool {
        $tokens = PushToken::query()
            ->where(
                'user_id',
                (int) $user->id
            )
            ->where('provider', 'expo')
            ->where('is_active', true)
            ->pluck('token')
            ->filter(
                static fn($token): bool =>
                is_string($token)
                && trim($token) !== ''
            )
            ->map(
                static fn($token): string =>
                trim($token)
            )
            ->unique()
            ->values()
            ->all();

        if ($tokens === []) {
            return false;
        }

        $messages = [];

        foreach ($tokens as $token) {
            $notification = [
                'to' => $token,
                'title' => $title,
                'body' => $body,
                'data' => $data,
                'priority' => 'high',
                'channelId' => 'chat-messages-v3',
                'categoryId' => $categoryId !== '' ? $categoryId : 'chat_message',
            ];

            if (
                is_string($imageUrl)
                && trim($imageUrl) !== ''
            ) {
                $notification['richContent'] = [
                    'image' => trim($imageUrl),
                ];
            }

            $messages[] = $notification;
        }

        return $this->send($messages);
    }

    private function send(array $messages): bool
    {
        if ($messages === []) {
            return false;
        }

        $payload = json_encode(
            $messages,
            JSON_UNESCAPED_UNICODE
            | JSON_UNESCAPED_SLASHES
        );

        if ($payload === false) {
            return false;
        }

        $curl = curl_init(self::EXPO_PUSH_URL);

        if ($curl === false) {
            return false;
        }

        try {
            curl_setopt_array(
                $curl,
                [
                    CURLOPT_POST => true,
                    CURLOPT_RETURNTRANSFER => true,

                    CURLOPT_HTTPHEADER => [
                        'Accept: application/json',
                        'Content-Type: application/json',
                    ],

                    CURLOPT_POSTFIELDS => $payload,

                    CURLOPT_CONNECTTIMEOUT => 5,
                    CURLOPT_TIMEOUT => 10,
                ]
            );

            $response = curl_exec($curl);

            if ($response === false) {
                throw new Exception(
                    curl_error($curl)
                );
            }

            $statusCode = (int) curl_getinfo(
                $curl,
                CURLINFO_HTTP_CODE
            );
            file_put_contents(
                dirname(__DIR__, 2) . '/push-debug.log',
                '[' . date('Y-m-d H:i:s') . '] '
                . 'Expo Push Response [' . $statusCode . ']: '
                . $response
                . PHP_EOL,
                FILE_APPEND
            );

            if (
                $statusCode < 200
                || $statusCode >= 300
            ) {
                throw new Exception(
                    'Expo Push API returned HTTP '
                    . $statusCode
                    . ': '
                    . $response
                );
            }

            $decoded = json_decode(
                $response,
                true
            );

            if (!is_array($decoded)) {
                throw new Exception(
                    'Невалиден отговор от Expo Push API.'
                );
            }

            if (!isset($decoded['data'])) {
                throw new Exception(
                    'Expo Push API не върна data.'
                );
            }

            return true;
        } finally {
            curl_close($curl);
        }
    }
}
