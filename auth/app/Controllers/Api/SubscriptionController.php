<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Services\PaymentsFeature;
use App\Services\StripeSandboxFeature;
use App\Services\SubscriptionCheckoutHandoffService;
use App\Services\SubscriptionCancellationService;
use App\Services\SubscriptionRenewalService;
use App\Services\SubscriptionService;
use RuntimeException;

final class SubscriptionController extends BaseController
{
    private SubscriptionService $subscriptions;
    public function __construct() { $this->subscriptions = new SubscriptionService(); }

    public function plans() { return $this->json(['success' => true, 'data' => $this->subscriptions->plans()]); }

    public function current()
    {
        $user = $this->authenticatedUser(); if (!$user) return $this->json(['success' => false, 'message' => 'Необходима е автентикация.'], 401);
        $subscription = $this->subscriptions->current($user);
        $entitled = $subscription && $this->subscriptions->hasPaidEntitlement($user);
        return $this->json(['success' => true, 'data' => $subscription ? [
            'plan' => $entitled ? $subscription->plan : 'free',
            'status' => $subscription->status,
            'entitled' => $entitled,
            'auto_renewal' => !(bool) $subscription->cancel_at_period_end,
            'cancel_at_period_end' => (bool) $subscription->cancel_at_period_end,
            'current_period_end' => $subscription->current_period_end?->toISOString(),
        ] : null]);
    }

    public function checkout()
    {
        $user = $this->authenticatedUser(); if (!$user) return $this->json(['success' => false, 'message' => 'Необходима е автентикация.'], 401);
        if (!PaymentsFeature::isEnabled() && !StripeSandboxFeature::enabledFor($user)) return $this->paymentsUnavailable();
        $input = json_decode(file_get_contents('php://input'), true); $plan = is_array($input) ? trim((string) ($input['plan'] ?? '')) : '';
        if ($plan !== 'paid') return $this->json(['success' => false, 'message' => 'Невалиден платен план.'], 422);
        try { return $this->json(['success' => true, 'url' => (new SubscriptionCheckoutHandoffService())->create($user)]); }
        catch (RuntimeException $e) { return $this->json(['success' => false, 'message' => $e->getMessage()], 422); }
    }

    public function renewal()
    {
        $user = $this->authenticatedUser();
        if (!$user) return $this->json(['success' => false, 'message' => 'Необходима е автентикация.'], 401);
        $input = json_decode(file_get_contents('php://input'), true);
        if (!is_array($input) || !array_key_exists('auto_renewal', $input) || !is_bool($input['auto_renewal'])) {
            return $this->json(['success' => false, 'message' => 'Изберете дали автоматичното подновяване да бъде включено.'], 422);
        }
        try {
            $subscription = (new SubscriptionRenewalService())->update($user, $input['auto_renewal']);
            return $this->json(['success' => true, 'data' => [
                'auto_renewal' => !(bool) $subscription->cancel_at_period_end,
                'cancel_at_period_end' => (bool) $subscription->cancel_at_period_end,
                'current_period_end' => $subscription->current_period_end?->toISOString(),
            ]]);
        } catch (RuntimeException $error) {
            return $this->json(['success' => false, 'message' => $error->getMessage()], 422);
        }
    }

    public function cancel()
    {
        $user = $this->authenticatedUser();
        if (!$user) return $this->json(['success' => false, 'message' => 'Необходима е автентикация.'], 401);
        $input = json_decode(file_get_contents('php://input'), true);
        if (!is_array($input) || ($input['confirm_immediate_downgrade'] ?? false) !== true) {
            return $this->json(['success' => false, 'message' => 'Потвърдете незабавното преминаване към безплатен план.'], 422);
        }
        try {
            $subscription = (new SubscriptionCancellationService())->cancelImmediately($user);
            return $this->json(['success' => true, 'data' => [
                'plan' => 'free',
                'status' => $subscription->status,
                'entitled' => false,
                'auto_renewal' => false,
                'cancel_at_period_end' => true,
                'current_period_end' => null,
            ]]);
        } catch (RuntimeException $error) {
            return $this->json(['success' => false, 'message' => $error->getMessage()], 422);
        }
    }

    public function webhook()
    {
        if (!PaymentsFeature::isEnabled() && !StripeSandboxFeature::enabled()) return $this->paymentsUnavailable();
        try { $this->subscriptions->handleWebhook(file_get_contents('php://input'), $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? ''); return $this->json(['received' => true]); }
        catch (RuntimeException $e) { return $this->json(['success' => false, 'message' => $e->getMessage()], 400); }
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
