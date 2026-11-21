<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Services\PaymentMethodService;
use App\Services\PaymentsFeature;
use App\Services\SubscriptionRenewalService;
use Illuminate\Support\Facades\Validator;
use RuntimeException;

final class PaymentMethodController extends BaseController
{
    private PaymentMethodService $paymentMethods;

    public function __construct()
    {
        $this->paymentMethods = new PaymentMethodService();
    }

    public function index()
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        $methods = $this->paymentMethods->listFor($user);

        return $this->json([
            'success' => true,
            'data' => $methods
                ->map(fn ($method) => $this->paymentMethods->serialize($method))
                ->values(),
            'auto_renewal' => $user->wantsAutoRenewal(),
        ]);
    }

    public function updateSettings()
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        $input = $this->jsonInput();
        $validator = Validator::make(
            $input,
            ['auto_renewal' => 'required|boolean'],
            [
                'required' => 'Полето :attribute е задължително.',
                'boolean' => 'Полето :attribute трябва да бъде да или не.',
            ],
            ['auto_renewal' => 'автоматично подновяване']
        );

        if ($validator->fails()) {
            return $this->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors()->toArray(),
            ], 422);
        }

        try {
            $subscription = (new SubscriptionRenewalService())->update($user, (bool) $input['auto_renewal']);
        } catch (RuntimeException $error) {
            return $this->json(['success' => false, 'message' => $error->getMessage()], 422);
        }

        return $this->json([
            'success' => true,
            'message' => !(bool) $subscription->cancel_at_period_end
                ? 'Автоматичното подновяване е включено.'
                : 'Автоматичното подновяване е изключено.',
            'auto_renewal' => !(bool) $subscription->cancel_at_period_end,
        ]);
    }

    public function store()
    {
        if (!$this->authenticatedUser()) return $this->unauthorized();
        return $this->json([
            'success' => false,
            'code' => 'stripe_hosted_only',
            'message' => 'Картови данни се въвеждат единствено в защитената Stripe страница.',
        ], 410);
    }

    public function setDefault($id)
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        $method = $this->paymentMethods->setDefault($user, (int) $id);

        if (!$method) {
            return $this->json([
                'success' => false,
                'message' => 'Картата не е намерена.',
            ], 404);
        }

        return $this->json([
            'success' => true,
            'message' => 'Картата е избрана по подразбиране.',
            'data' => $this->paymentMethods->serialize($method),
        ]);
    }

    public function destroy($id)
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        $deleted = $this->paymentMethods->delete($user, (int) $id);

        if (!$deleted) {
            return $this->json([
                'success' => false,
                'message' => 'Картата не е намерена.',
            ], 404);
        }

        return $this->json([
            'success' => true,
            'message' => 'Картата беше премахната.',
        ]);
    }

    private function jsonInput(): array
    {
        $input = json_decode(file_get_contents('php://input'), true);

        return is_array($input) ? $input : [];
    }

    private function unauthorized()
    {
        return $this->json([
            'success' => false,
            'message' => 'Необходима е автентикация.',
        ], 401);
    }

    private function paymentsUnavailable()
    {
        return $this->json([
            'success' => false,
            'code' => 'payments_disabled',
            'message' => 'Плащанията не са достъпни в тази версия.',
        ], 503);
    }
}
