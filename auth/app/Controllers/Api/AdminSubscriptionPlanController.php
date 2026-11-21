<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Services\BillingAdminRequestVerifier;
use App\Services\PaidPlanPricePolicy;
use App\Services\PaidPlanService;
use InvalidArgumentException;
use RuntimeException;
use Throwable;

final class AdminSubscriptionPlanController extends BaseController
{
    public function show()
    {
        $user = (new BillingAdminRequestVerifier())->verify('GET', '/api/admin/paid-plan', '');
        if (!$user) {
            return $this->json(['success' => false, 'code' => 'forbidden', 'message' => 'Нямате необходимите права.'], 403);
        }

        try {
            return $this->json([
                'success' => true,
                'data' => PaidPlanService::make()->publicData(),
            ]);
        } catch (Throwable) {
            return $this->json(['success' => false, 'code' => 'configuration_unavailable', 'message' => 'Настройката не може да бъде заредена.'], 503);
        }
    }

    public function update()
    {
        $rawBody = (string) file_get_contents('php://input');
        $user = (new BillingAdminRequestVerifier())->verify('POST', '/api/admin/paid-plan', $rawBody);
        if (!$user) {
            return $this->json(['success' => false, 'code' => 'forbidden', 'message' => 'Нямате необходимите права.'], 403);
        }

        $input = json_decode($rawBody, true);
        if (!is_array($input)) {
            return $this->json(['success' => false, 'code' => 'invalid_json', 'message' => 'Невалидна заявка.'], 422);
        }

        try {
            $expectedVersion = filter_var($input['expected_version'] ?? null, FILTER_VALIDATE_INT);
            if ($expectedVersion === false) {
                throw new InvalidArgumentException('Липсва валидна версия на настройката.');
            }
            $service = PaidPlanService::make();
            if (array_key_exists('is_active', $input) && !array_key_exists('amount_eur', $input)) {
                if (!is_bool($input['is_active'])) {
                    throw new InvalidArgumentException('Невалиден статус на плана.');
                }
                $plan = $service->setAvailability($user, $input['is_active'], $expectedVersion);
                return $this->json(['success' => true, 'data' => $service->publicData($plan)]);
            }

            $amountCents = (new PaidPlanPricePolicy())->parseEuroAmount((string) ($input['amount_eur'] ?? ''));
            $requestId = trim((string) ($input['request_id'] ?? ''));
            $plan = $service->changePrice($user, $amountCents, $requestId, $expectedVersion);

            return $this->json(['success' => true, 'data' => $service->publicData($plan)]);
        } catch (InvalidArgumentException $error) {
            return $this->json(['success' => false, 'code' => 'invalid_price', 'message' => $error->getMessage()], 422);
        } catch (RuntimeException $error) {
            $conflict = str_contains($error->getMessage(), 'друг администратор');
            return $this->json([
                'success' => false,
                'code' => $conflict ? 'version_conflict' : 'price_change_failed',
                'message' => $error->getMessage(),
            ], $conflict ? 409 : 422);
        } catch (Throwable) {
            return $this->json(['success' => false, 'code' => 'price_change_failed', 'message' => 'Цената не можа да бъде променена.'], 500);
        }
    }

}
