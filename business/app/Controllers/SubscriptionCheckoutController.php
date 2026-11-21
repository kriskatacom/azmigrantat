<?php

namespace App\Controllers;

use App\Services\SubscriptionCheckoutClient;
use RuntimeException;

final class SubscriptionCheckoutController extends BaseController
{
    public function start()
    {
        $token = strtolower(trim((string) ($_GET['token'] ?? '')));
        if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
            return $this->renderResult('Невалиден линк', 'Линкът за тестово плащане е невалиден.', null, false);
        }

        try {
            return $this->redirect((new SubscriptionCheckoutClient())->start($token));
        } catch (RuntimeException $error) {
            return $this->renderResult('Плащането не стартира', $error->getMessage(), null, false);
        }
    }

    public function result()
    {
        $sessionId = trim((string) ($_GET['session_id'] ?? ''));
        $checkout = trim((string) ($_GET['checkout'] ?? ''));
        $cancelled = ($_GET['status'] ?? '') === 'cancelled';

        if ($cancelled) {
            return $this->renderResult(
                'Плащането е прекратено',
                'Не е извършено плащане и планът не е променен.',
                'chatapp://subscription-result?status=cancelled',
                false
            );
        }

        if (!str_starts_with($sessionId, 'cs_test_')) {
            return $this->renderResult('Невалидна сесия', 'Checkout сесията не може да бъде проверена.', null, false);
        }

        return $this->renderWithSeo('subscriptions/checkout-result', [
            'title' => 'Потвърждение на абонамента',
        ], [
            'sessionId' => $sessionId,
            'checkout' => $checkout,
        ]);
    }

    public function status()
    {
        $input = json_decode((string) file_get_contents('php://input'), true);
        $sessionId = is_array($input) ? trim((string) ($input['session_id'] ?? '')) : '';
        $checkout = is_array($input) ? trim((string) ($input['checkout'] ?? '')) : '';

        try {
            return $this->json([
                'success' => true,
                'data' => (new SubscriptionCheckoutClient())->status($sessionId, $checkout),
            ]);
        } catch (RuntimeException $error) {
            http_response_code(422);
            return $this->json(['success' => false, 'message' => $error->getMessage()]);
        }
    }

    private function renderResult(string $title, string $message, ?string $returnUrl, bool $success)
    {
        return $this->renderWithSeo('subscriptions/simple-result', ['title' => $title], [
            'heading' => $title,
            'message' => $message,
            'returnUrl' => $returnUrl,
            'success' => $success,
        ]);
    }
}

