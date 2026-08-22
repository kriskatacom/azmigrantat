<?php

namespace App\Services;

final class SmsApiService
{
    /** @var list<string> */
    private const AUTH_FALLBACK_HOSTS = [
        'https://smsapi.io',
        'https://api.smsapi.com',
        'https://api.smsapi.pl',
    ];

    /**
     * @return array{ok: bool, error?: int, message?: string}
     */
    public function sendSms(string $phoneNumber, string $message): array
    {
        $token = trim((string) ($_ENV['SMSAPI_TOKEN'] ?? ''), " \t\n\r\0\x0B\"'");
        if ($token === '') {
            error_log('[SmsApi] missing SMSAPI_TOKEN');
            return [
                'ok' => false,
                'message' => 'Липсва SMSAPI_TOKEN.',
            ];
        }

        $preferred = rtrim((string) ($_ENV['SMSAPI_BASE_URL'] ?? 'https://smsapi.io'), '/');
        $from = trim((string) ($_ENV['SMSAPI_FROM'] ?? ''));
        $hosts = array_values(array_unique(array_filter([
            $preferred !== '' ? $preferred : null,
            ...self::AUTH_FALLBACK_HOSTS,
        ])));

        $includeFrom = $from !== '';
        $last = ['ok' => false, 'message' => 'SMS не можа да бъде изпратен.'];

        foreach ($hosts as $baseUrl) {
            $result = $this->sendOnce($baseUrl, $token, $phoneNumber, $message, $includeFrom ? $from : null);

            if ($result === true) {
                return ['ok' => true];
            }

            $error = is_array($result) ? (int) ($result['error'] ?? 0) : 0;
            $apiMessage = is_array($result) ? (string) ($result['message'] ?? '') : '';

            if ($error === 14 && $includeFrom) {
                error_log('[SmsApi] sender "' . $from . '" is not allowed, retrying without from');
                $includeFrom = false;
                $retry = $this->sendOnce($baseUrl, $token, $phoneNumber, $message, null);
                if ($retry === true) {
                    return ['ok' => true];
                }
                $error = is_array($retry) ? (int) ($retry['error'] ?? 0) : 0;
                $apiMessage = is_array($retry) ? (string) ($retry['message'] ?? '') : '';
            }

            $last = [
                'ok' => false,
                'error' => $error,
                'message' => $this->userMessage($error, $apiMessage),
            ];

            if ($error !== 101 && $error !== 102) {
                return $last;
            }
        }

        return $last;
    }

    private function userMessage(int $error, string $apiMessage): string
    {
        return match ($error) {
            103 => 'SMSAPI акаунтът няма достатъчно средства. Зареди кредит в smsapi.io / smsapi.bg.',
            13 => 'Невалиден телефонен номер за SMS.',
            14 => 'Името на подателя (SMSAPI_FROM) не е одобрено в SMSAPI.',
            101, 102 => 'SMSAPI токенът е невалиден за този хост.',
            112 => 'SMSAPI не позволява изпращане към тази държава за този акаунт.',
            default => $apiMessage !== ''
                ? $apiMessage
                : 'Кодът не можа да бъде изпратен по SMS.',
        };
    }

    /**
     * @return true|array<string, mixed>|null
     */
    private function sendOnce(
        string $baseUrl,
        string $token,
        string $phoneNumber,
        string $message,
        ?string $from
    ): bool|array|null {
        $payload = [
            'to' => $phoneNumber,
            'message' => $message,
            'format' => 'json',
            'encoding' => 'utf-8',
            'access_token' => $token,
        ];

        if ($from !== null && $from !== '') {
            $payload['from'] = $from;
        }

        $response = $this->post($baseUrl . '/sms.do', $token, $payload);
        if ($response === null) {
            return null;
        }

        if (isset($response['error'])) {
            error_log(
                '[SmsApi] send failed host=' . $baseUrl
                . ' error=' . (string) $response['error']
                . ' message=' . (string) ($response['message'] ?? '')
            );

            return $response;
        }

        $list = $response['list'] ?? null;
        if (is_array($list) && $list !== []) {
            $first = $list[0];
            $status = is_array($first) ? ($first['status'] ?? null) : null;
            if (is_string($status) && strtoupper($status) === 'ERROR') {
                error_log('[SmsApi] send status error host=' . $baseUrl);
                return ['error' => 200, 'message' => 'list status ERROR'];
            }
        }

        return true;
    }

    /**
     * @param array<string, string> $payload
     * @return array<string, mixed>|null
     */
    private function post(string $url, string $token, array $payload): ?array
    {
        $curl = curl_init($url);
        if ($curl === false) {
            return null;
        }

        try {
            curl_setopt_array($curl, [
                CURLOPT_POST => true,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => [
                    'Authorization: Bearer ' . $token,
                    'Content-Type: application/x-www-form-urlencoded',
                    'Accept: application/json',
                ],
                CURLOPT_POSTFIELDS => http_build_query($payload),
                CURLOPT_CONNECTTIMEOUT => 5,
                CURLOPT_TIMEOUT => 15,
            ]);

            $body = curl_exec($curl);
            if ($body === false) {
                error_log('[SmsApi] curl error url=' . $url . ' info=' . curl_error($curl));
                return null;
            }

            $statusCode = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
            $decoded = json_decode((string) $body, true);
            if ($statusCode >= 400 && !is_array($decoded)) {
                error_log('[SmsApi] HTTP ' . $statusCode . ' url=' . $url . ' body=' . substr((string) $body, 0, 300));
                return null;
            }

            return is_array($decoded) ? $decoded : [];
        } finally {
            curl_close($curl);
        }
    }
}
