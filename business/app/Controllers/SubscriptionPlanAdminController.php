<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Session;
use App\Helpers\SecurityHelper;
use App\Services\BillingAdminClient;
use RuntimeException;

final class SubscriptionPlanAdminController extends BaseController
{
    public function index()
    {
        $user = Auth::user();
        try {
            $plan = (new BillingAdminClient())->getPlan((string) $user->email);
            $loadError = null;
        } catch (RuntimeException $error) {
            $plan = ['configured' => false, 'version' => 0];
            $loadError = $error->getMessage();
        }

        $this->renderAdmin('admin/subscription-plan/index', [
            'title' => 'Платен абонамент',
        ], [
            'plan' => $plan,
            'loadError' => $loadError,
            'requestId' => bin2hex(random_bytes(16)),
            'csrfToken' => Session::csrfToken(),
        ]);
    }

    public function update()
    {
        if (!SecurityHelper::checkCsrf()) {
            $this->flash('error', 'Сесията изтече. Презаредете страницата и опитайте отново.');
            return $this->redirect('/admin/subscription-plan');
        }

        if (($_POST['confirmed'] ?? '') !== '1') {
            $this->flash('error', 'Промяната трябва да бъде потвърдена.');
            return $this->redirect('/admin/subscription-plan');
        }

        $operation = (string) ($_POST['operation'] ?? 'price');
        $amount = trim((string) ($_POST['amount_eur'] ?? ''));
        $requestId = trim((string) ($_POST['request_id'] ?? ''));
        $expectedVersion = filter_var($_POST['expected_version'] ?? null, FILTER_VALIDATE_INT);
        if ($expectedVersion === false
            || $expectedVersion < 0) {
            $this->flash('error', 'Въведените данни са невалидни.');
            return $this->redirect('/admin/subscription-plan');
        }

        try {
            $user = Auth::user();
            if ($operation === 'availability') {
                (new BillingAdminClient())->updatePlan((string) $user->email, [
                    'is_active' => ($_POST['is_active'] ?? '') === '1',
                    'expected_version' => $expectedVersion,
                ]);
                $this->flash('success', ($_POST['is_active'] ?? '') === '1'
                    ? 'Платеният план е активен за нови покупки.'
                    : 'Новите покупки на платения план са спрени.');
            } else {
                if (!preg_match('/^(?:0|[1-9]\d{0,3})(?:[.,]\d{1,2})?$/', $amount)
                    || !preg_match('/^[a-f0-9]{32}$/', $requestId)) {
                    throw new RuntimeException('Въведените данни са невалидни.');
                }
                (new BillingAdminClient())->updatePlan((string) $user->email, [
                    'amount_eur' => str_replace(',', '.', $amount),
                    'request_id' => $requestId,
                    'expected_version' => $expectedVersion,
                ]);
                $this->flash('success', 'Новата цена за 30 дни е активна за бъдещи тестови абонаменти.');
            }
        } catch (RuntimeException $error) {
            $this->flash('error', $error->getMessage());
        }

        return $this->redirect('/admin/subscription-plan');
    }
}
