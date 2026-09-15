<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Helpers\SecurityHelper;
use App\Services\SubscriptionService;
use RuntimeException;

final class SubscriptionWebController extends BaseController
{
    private SubscriptionService $subscriptions;

    public function __construct()
    {
        $this->subscriptions = new SubscriptionService();
    }

    public function index()
    {
        if (!Auth::check()) {
            $requestedPlan = trim((string) ($_GET['plan'] ?? ''));
            $returnTo = '/subscriptions' . ($requestedPlan !== '' ? '?plan=' . rawurlencode($requestedPlan) : '');
            return $this->redirect('/users/login?return_to=' . rawurlencode($returnTo));
        }

        $user = Auth::user();
        $plans = $this->subscriptions->plans();
        $selectedPlan = trim((string) ($_GET['plan'] ?? ''));
        if (!isset($plans[$selectedPlan]) || $plans[$selectedPlan]['price_cents'] <= 0) {
            $selectedPlan = null;
        }

        $this->renderWithSeo('subscriptions/index', [
            'title' => 'Абонаментни планове',
            'description' => 'Изберете план за вашите short-video видеа.',
        ], [
            'plans' => $plans,
            'subscription' => $this->subscriptions->current($user),
            'selectedPlan' => $selectedPlan,
        ]);
    }

    public function checkout()
    {
        if (!Auth::check()) {
            $plan = trim((string) ($_POST['plan'] ?? ''));
            $returnTo = '/subscriptions' . ($plan !== '' ? '?plan=' . rawurlencode($plan) : '');
            return $this->redirect('/users/login?return_to=' . rawurlencode($returnTo));
        }

        $this->validateSpam();
        try {
            $plan = trim((string) ($_POST['plan'] ?? ''));
            $url = $this->subscriptions->createCheckout(Auth::user(), $plan);
            return $this->redirect($url);
        } catch (RuntimeException $exception) {
            $this->flash('error', $exception->getMessage());
            return $this->redirect('/subscriptions');
        }
    }

    public function success()
    {
        if (!Auth::check()) return $this->redirect('/users/login');
        $this->renderWithSeo('subscriptions/result', [
            'title' => 'Абонаментът е изпратен за обработка',
            'description' => 'Проверяваме плащането и активираме избрания план.',
        ], ['success' => true]);
    }

    public function cancel()
    {
        if (!Auth::check()) return $this->redirect('/users/login');
        $this->renderWithSeo('subscriptions/result', [
            'title' => 'Плащането беше отменено',
            'description' => 'Можете да изберете план по всяко време.',
        ], ['success' => false]);
    }
}
