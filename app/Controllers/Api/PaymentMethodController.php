<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Services\PaymentMethodService;
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

        $user->setAutoRenewal((bool) $input['auto_renewal']);

        return $this->json([
            'success' => true,
            'message' => $user->wantsAutoRenewal()
                ? 'Автоматичното подновяване е включено.'
                : 'Автоматичното подновяване е изключено.',
            'auto_renewal' => $user->wantsAutoRenewal(),
        ]);
    }

    public function store()
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        $input = $this->jsonInput();
        $validator = Validator::make(
            $input,
            [
                'number' => 'required|string|max:32',
                'exp_month' => 'required|integer|min:1|max:12',
                'exp_year' => 'required|integer|min:2020|max:2100',
                'cvc' => 'required|string|min:3|max:4',
                'holder_name' => 'nullable|string|max:80',
            ],
            [
                'required' => 'Полето :attribute е задължително.',
                'integer' => 'Полето :attribute трябва да бъде число.',
                'min' => 'Полето :attribute е невалидно.',
                'max' => 'Полето :attribute е невалидно.',
            ],
            [
                'number' => 'номер на карта',
                'exp_month' => 'месец',
                'exp_year' => 'година',
                'cvc' => 'CVC',
                'holder_name' => 'име на картодържател',
            ]
        );

        if ($validator->fails()) {
            return $this->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors()->toArray(),
            ], 422);
        }

        $cvc = preg_replace('/\D+/', '', (string) $input['cvc']) ?? '';

        if (!preg_match('/^\d{3,4}$/', $cvc)) {
            return $this->json([
                'success' => false,
                'message' => 'Невалиден CVC код.',
            ], 422);
        }

        try {
            $method = $this->paymentMethods->save(
                $user,
                (string) $input['number'],
                (int) $input['exp_month'],
                (int) $input['exp_year'],
                isset($input['holder_name']) ? (string) $input['holder_name'] : null
            );

            return $this->json([
                'success' => true,
                'message' => 'Картата беше запазена за бъдещи плащания.',
                'data' => $this->paymentMethods->serialize($method),
            ], 201);
        } catch (RuntimeException $exception) {
            return $this->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 422);
        }
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
}
