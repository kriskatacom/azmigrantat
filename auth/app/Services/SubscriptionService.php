<?php

namespace App\Services;

use App\Models\BillingEvent;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Database\Capsule\Manager as DB;
use RuntimeException;

final class SubscriptionService
{
    public function plans(): array
    {
        return require dirname(__DIR__) . '/Config/short_video_plans.php';
    }

    public function createCheckout(User $user, string $plan): string
    {
        $plans = $this->plans();
        $priceId = trim((string) ($_ENV['STRIPE_PRICE_' . strtoupper($plan)] ?? getenv('STRIPE_PRICE_' . strtoupper($plan)) ?: ''));

        if (!isset($plans[$plan]) || $plan === 'free' || $priceId === '') {
            throw new RuntimeException('Избраният план не е конфигуриран за плащане.');
        }

        $success = $this->setting('STRIPE_SUCCESS_URL', 'https://azmigrantat.com/subscriptions/success');
        $cancel = $this->setting('STRIPE_CANCEL_URL', 'https://azmigrantat.com/subscriptions/cancel');

        $session = $this->stripe('checkout/sessions', [
            'mode' => 'subscription',
            'customer_email' => $user->email,
            'client_reference_id' => (string) $user->id,
            'line_items[0][price]' => $priceId,
            'line_items[0][quantity]' => '1',
            'success_url' => $success . '?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => $cancel,
            'metadata[user_id]' => (string) $user->id,
            'metadata[plan]' => $plan,
            'subscription_data[metadata][user_id]' => (string) $user->id,
            'subscription_data[metadata][plan]' => $plan,
        ]);

        return (string) ($session['url'] ?? throw new RuntimeException('Stripe не върна Checkout адрес.'));
    }

    public function current(User $user): ?Subscription
    {
        return Subscription::query()->where('user_id', $user->id)->latest('id')->first();
    }

    public function handleWebhook(string $payload, string $signature): void
    {
        $event = json_decode($payload, true);
        if (!is_array($event) || !isset($event['id'], $event['type'], $event['data']['object'])) {
            throw new RuntimeException('Невалиден Stripe webhook.');
        }
        $this->verifySignature($payload, $signature);
        if (BillingEvent::query()->where('stripe_event_id', $event['id'])->exists()) return;

        DB::connection()->transaction(function () use ($event) {
            $object = $event['data']['object'];
            $type = $event['type'];
            if ($type === 'checkout.session.completed') {
                $this->sync($object['subscription'] ?? null, $object['customer'] ?? null, $object['metadata'] ?? []);
            } elseif (str_starts_with($type, 'customer.subscription.')) {
                $this->sync($object['id'] ?? null, $object['customer'] ?? null, $object['metadata'] ?? [], $object);
            }
            BillingEvent::create(['stripe_event_id' => $event['id'], 'event_type' => $type, 'processed_at' => date('Y-m-d H:i:s')]);
        });
    }

    private function sync(?string $subscriptionId, ?string $customerId, array $metadata, ?array $subscription = null): void
    {
        $userId = (int) ($metadata['user_id'] ?? 0);
        if (!$userId && $customerId) $userId = (int) (Subscription::query()->where('stripe_customer_id', $customerId)->value('user_id') ?? 0);
        if (!$userId || !$subscriptionId) return;
        $subscription ??= $this->stripe('subscriptions/' . rawurlencode($subscriptionId), [], 'GET');
        $priceId = $subscription['items']['data'][0]['price']['id'] ?? null;
        $plan = $metadata['plan'] ?? $this->planForPrice($priceId);
        if (!isset($this->plans()[$plan])) return;

        Subscription::updateOrCreate(['stripe_subscription_id' => $subscriptionId], [
            'user_id' => $userId, 'plan' => $plan, 'stripe_customer_id' => $customerId,
            'stripe_price_id' => $priceId, 'status' => $subscription['status'] ?? 'unknown',
            'cancel_at_period_end' => (bool) ($subscription['cancel_at_period_end'] ?? false),
            'current_period_start' => $this->date($subscription['current_period_start'] ?? null),
            'current_period_end' => $this->date($subscription['current_period_end'] ?? null),
        ]);
    }

    private function stripe(string $path, array $data, string $method = 'POST'): array
    {
        $secret = trim((string) ($_ENV['STRIPE_SECRET_KEY'] ?? getenv('STRIPE_SECRET_KEY') ?: ''));
        if ($secret === '') throw new RuntimeException('Липсва STRIPE_SECRET_KEY.');
        $ch = curl_init('https://api.stripe.com/v1/' . $path);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $secret], CURLOPT_CUSTOMREQUEST => $method, CURLOPT_POSTFIELDS => $method === 'GET' ? null : http_build_query($data)]);
        $raw = curl_exec($ch); $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
        $result = json_decode((string) $raw, true);
        if ($code < 200 || $code >= 300 || !is_array($result)) throw new RuntimeException('Stripe заявката не беше успешна.');
        return $result;
    }

    private function verifySignature(string $payload, string $header): void
    {
        $secret = trim((string) ($_ENV['STRIPE_WEBHOOK_SECRET'] ?? getenv('STRIPE_WEBHOOK_SECRET') ?: ''));
        if ($secret === '') throw new RuntimeException('Липсва STRIPE_WEBHOOK_SECRET.');
        $parts = [];
        foreach (explode(',', $header) as $part) { [$key, $value] = array_pad(explode('=', $part, 2), 2, ''); $parts[$key][] = $value; }
        $timestamp = (int) ($parts['t'][0] ?? 0); $signature = $parts['v1'][0] ?? '';
        if (!$timestamp || abs(time() - $timestamp) > 300 || !hash_equals(hash_hmac('sha256', $timestamp . '.' . $payload, $secret), $signature)) throw new RuntimeException('Невалиден Stripe webhook подпис.');
    }

    private function planForPrice(?string $priceId): string { foreach ($this->plans() as $plan => $_) if ($plan !== 'free' && $priceId === ($_ENV['STRIPE_PRICE_' . strtoupper($plan)] ?? getenv('STRIPE_PRICE_' . strtoupper($plan)))) return $plan; return ''; }
    private function date($timestamp): ?string { return $timestamp ? date('Y-m-d H:i:s', (int) $timestamp) : null; }
    private function setting(string $key, string $fallback): string { return trim((string) ($_ENV[$key] ?? getenv($key) ?: $fallback)); }
}
