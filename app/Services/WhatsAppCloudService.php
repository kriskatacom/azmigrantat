<?php

namespace App\Services;

final class WhatsAppCloudService
{
    public function isConfigured(): bool
    {
        return trim((string) ($_ENV['WHATSAPP_ACCESS_TOKEN'] ?? '')) !== ''
            && trim((string) ($_ENV['WHATSAPP_PHONE_NUMBER_ID'] ?? '')) !== ''
            && trim((string) ($_ENV['WHATSAPP_TEMPLATE_NAME'] ?? '')) !== '';
    }

    public function sendOtp(string $phoneNumber, string $code, bool $includeButton = true): bool
    {
        if (!$this->isConfigured()) {
            return false;
        }

        $token = trim((string) $_ENV['WHATSAPP_ACCESS_TOKEN']);
        $phoneNumberId = trim((string) $_ENV['WHATSAPP_PHONE_NUMBER_ID']);
        $template = trim((string) $_ENV['WHATSAPP_TEMPLATE_NAME']);
        $language = trim((string) ($_ENV['WHATSAPP_TEMPLATE_LANGUAGE'] ?? 'bg'));
        $version = trim((string) ($_ENV['WHATSAPP_GRAPH_VERSION'] ?? 'v22.0'));

        $components = [
            [
                'type' => 'body',
                'parameters' => [
                    ['type' => 'text', 'text' => $code],
                ],
            ],
        ];

        if ($includeButton) {
            $components[] = [
                'type' => 'button',
                'sub_type' => 'url',
                'index' => '0',
                'parameters' => [
                    ['type' => 'text', 'text' => $code],
                ],
            ];
        }

        $url = 'https://graph.facebook.com/' . $version . '/' . rawurlencode($phoneNumberId) . '/messages';
        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $phoneNumber,
            'type' => 'template',
            'template' => [
                'name' => $template,
                'language' => ['code' => $language],
                'components' => $components,
            ],
        ];

        $curl = curl_init($url);
        if ($curl === false) {
            return false;
        }

        try {
            curl_setopt_array($curl, [
                CURLOPT_POST => true,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => [
                    'Authorization: Bearer ' . $token,
                    'Content-Type: application/json',
                ],
                CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
                CURLOPT_CONNECTTIMEOUT => 5,
                CURLOPT_TIMEOUT => 15,
            ]);

            $body = curl_exec($curl);
            if ($body === false) {
                error_log('[WhatsApp] curl error');
                return false;
            }

            $statusCode = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
            $decoded = json_decode((string) $body, true);
            if ($statusCode >= 200 && $statusCode < 300 && is_array($decoded) && isset($decoded['messages'])) {
                return true;
            }

            if ($includeButton) {
                return $this->sendOtp($phoneNumber, $code, false);
            }

            error_log('[WhatsApp] HTTP ' . $statusCode);
            return false;
        } finally {
            curl_close($curl);
        }
    }
}
