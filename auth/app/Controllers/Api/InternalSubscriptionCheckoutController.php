<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Services\BillingCheckoutRequestVerifier;
use App\Services\SubscriptionCheckoutHandoffService;
use RuntimeException;
use Throwable;

final class InternalSubscriptionCheckoutController extends BaseController
{
    private const START_PATH = '/api/internal/subscription-checkout/start';
    private const STATUS_PATH = '/api/internal/subscription-checkout/status';

    public function start()
    {
        $body = (string) file_get_contents('php://input');
        if (!(new BillingCheckoutRequestVerifier())->verify('POST', self::START_PATH, $body)) {
            return $this->json(['success' => false, 'code' => 'forbidden', 'message' => 'Невалидна вътрешна заявка.'], 403);
        }

        $input = json_decode($body, true);
        $token = is_array($input) ? trim((string) ($input['token'] ?? '')) : '';
        if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
            return $this->json(['success' => false, 'code' => 'invalid_token', 'message' => 'Невалиден checkout линк.'], 422);
        }

        try {
            return $this->json([
                'success' => true,
                'data' => ['checkout_url' => (new SubscriptionCheckoutHandoffService())->start($token)],
            ]);
        } catch (RuntimeException $error) {
            return $this->json(['success' => false, 'code' => 'checkout_unavailable', 'message' => $error->getMessage()], 422);
        } catch (Throwable) {
            return $this->json(['success' => false, 'code' => 'checkout_unavailable', 'message' => 'Checkout не може да бъде стартиран.'], 500);
        }
    }

    public function status()
    {
        $body = (string) file_get_contents('php://input');
        if (!(new BillingCheckoutRequestVerifier())->verify('POST', self::STATUS_PATH, $body)) {
            return $this->json(['success' => false, 'code' => 'forbidden', 'message' => 'Невалидна вътрешна заявка.'], 403);
        }

        $input = json_decode($body, true);
        try {
            $data = (new SubscriptionCheckoutHandoffService())->status(
                is_array($input) ? trim((string) ($input['session_id'] ?? '')) : null,
                is_array($input) ? trim((string) ($input['checkout'] ?? '')) : null,
            );
            return $this->json(['success' => true, 'data' => $data]);
        } catch (RuntimeException $error) {
            return $this->json(['success' => false, 'code' => 'status_unavailable', 'message' => $error->getMessage()], 422);
        }
    }
}

