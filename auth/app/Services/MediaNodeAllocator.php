<?php

namespace App\Services;

use RuntimeException;

final class MediaNodeAllocator
{
    private string $realtimeUrl;
    private string $internalSecret;
    private int $timeoutSeconds = 5;

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

        if ($this->realtimeUrl === '' || $this->internalSecret === '') {
            throw new RuntimeException('Липсва realtime конфигурация за media allocation.');
        }
    }

    /** @return array<string, mixed> */
    public function allocate(int $liveId, string $mediaRoomId): array
    {
        $response = $this->request('/internal/media/allocate', [
            'live_id' => $liveId,
            'media_room_id' => $mediaRoomId,
        ]);

        $assignment = $response['assignment'] ?? null;

        if (!is_array($assignment)) {
            throw new RuntimeException('Realtime не върна media assignment.');
        }

        return $assignment;
    }

    /** @return array<string, mixed>|null */
    public function assignment(int $liveId): ?array
    {
        $url = $this->realtimeUrl . '/internal/media/assignment/' . $liveId;
        $response = $this->requestUrl('GET', $url);

        if (($response['status'] ?? 0) === 404) {
            return null;
        }

        $assignment = $response['body']['assignment'] ?? null;

        return is_array($assignment) ? $assignment : null;
    }

    public function release(int $liveId): void
    {
        $this->request('/internal/media/release', ['live_id' => $liveId]);
    }

    /** @return array<string, mixed> */
    public function session(int $liveId, string $role): array
    {
        $response = $this->request('/internal/media/session', [
            'live_id' => $liveId,
            'role' => $role,
        ]);
        $session = $response['session'] ?? null;

        if (!is_array($session)) {
            throw new RuntimeException('Realtime не върна media session.');
        }

        return $session;
    }

    /** @param array<string, mixed> $payload */
    /** @return array<string, mixed> */
    private function request(string $endpoint, array $payload): array
    {
        $response = $this->requestUrl(
            'POST',
            $this->realtimeUrl . $endpoint,
            $payload
        );

        if (($response['status'] ?? 0) < 200 || ($response['status'] ?? 0) >= 300) {
            $message = is_array($response['body'] ?? null)
                ? (string) ($response['body']['message'] ?? '')
                : '';
            throw new RuntimeException(sprintf(
                'Realtime media allocation request failed (HTTP %d)%s.',
                (int) ($response['status'] ?? 0),
                $message !== '' ? ': ' . $message : ''
            ));
        }

        return is_array($response['body'] ?? null) ? $response['body'] : [];
    }

    /** @param array<string, mixed>|null $payload */
    /** @return array{status:int,body:array<string,mixed>} */
    private function requestUrl(string $method, string $url, ?array $payload = null): array
    {
        $curl = curl_init($url);

        if ($curl === false) {
            throw new RuntimeException('Неуспешно инициализиране на media allocation заявка.');
        }

        $headers = [
            'Accept: application/json',
            'X-Internal-Secret: ' . $this->internalSecret,
        ];

        $options = [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => $this->timeoutSeconds,
            CURLOPT_TIMEOUT => $this->timeoutSeconds,
        ];

        if ($payload !== null) {
            $headers[] = 'Content-Type: application/json';
            $options[CURLOPT_POSTFIELDS] = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        }

        $options[CURLOPT_HTTPHEADER] = $headers;
        curl_setopt_array($curl, $options);

        $body = curl_exec($curl);
        $error = curl_error($curl);
        $status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);

        if ($body === false || $error !== '') {
            throw new RuntimeException('Грешка при връзка с media allocation service.');
        }

        $decoded = json_decode((string) $body, true);

        return [
            'status' => $status,
            'body' => is_array($decoded) ? $decoded : [],
        ];
    }
}
