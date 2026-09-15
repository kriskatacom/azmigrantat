<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
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
        return $this->json(['success' => true, 'data' => $subscription ? ['plan' => $subscription->plan, 'status' => $subscription->status, 'cancel_at_period_end' => (bool) $subscription->cancel_at_period_end, 'current_period_end' => $subscription->current_period_end?->toISOString()] : null]);
    }

    public function checkout()
    {
        $user = $this->authenticatedUser(); if (!$user) return $this->json(['success' => false, 'message' => 'Необходима е автентикация.'], 401);
        $input = json_decode(file_get_contents('php://input'), true); $plan = is_array($input) ? trim((string) ($input['plan'] ?? '')) : '';
        try { return $this->json(['success' => true, 'url' => $this->subscriptions->createCheckout($user, $plan)]); }
        catch (RuntimeException $e) { return $this->json(['success' => false, 'message' => $e->getMessage()], 422); }
    }

    public function webhook()
    {
        try { $this->subscriptions->handleWebhook(file_get_contents('php://input'), $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? ''); return $this->json(['received' => true]); }
        catch (RuntimeException $e) { return $this->json(['success' => false, 'message' => $e->getMessage()], 400); }
    }
}
