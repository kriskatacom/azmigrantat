<?php

namespace App\Services;

final class SmsApiService
{
    public function sendSms(string $phoneNumber, string $message): bool
    {
        $token = trim((string) ($_ENV['SMSAPI_TOKEN'] ?? ''));
        if ($token === '') {
            error_log('[SmsApi] missing SMSAPI_TOKEN');
            return false;
        }

        $baseUrl = rtrim((string) ($_ENV['SMSAPI_BASE_URL'] ?? 'https://api.smsapi.com'), '/');
        $from = trim((string) ($_ENV['SMSAPI_FROM'] ?? ''));

        $payload = [
            'to' => $phoneNumber,
            'message' => $message,
            'format' => 'json',
            'fast' => '0',
            'encoding' => 'utf-8',
        ];

        if ($from !== '') {
            $payload['from'] = $from;
        }

        $response = $this->post($baseUrl . '/sms.do', $token, $payload);
        if ($response === null) {
            return false;
        }

        if (isset($response['error'])) {
            error_log('[SmsApi] send failed error=' . (string) $response['error']);
            return false;
        }

        $list = $response['list'] ?? null;
        if (is_array($list) && $list !== []) {
            $first = $list[0];
            $status = is_array($first) ? ($first['status'] ?? null) : null;
            if (is_string($status) && strtoupper($status) === 'ERROR') {
                error_log('[SmsApi] send status error');
                return false;
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
                error_log('[SmsApi] curl error');
                return null;
            }

            $statusCode = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
            $decoded = json_decode((string) $body, true);
            if ($statusCode >= 400) {
                error_log('[SmsApi] HTTP ' . $statusCode);
                return is_array($decoded) ? $decoded : null;
            }

            return is_array($decoded) ? $decoded : [];
        } finally {
            curl_close($curl);
        }
    }
}
