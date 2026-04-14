<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Services\EmailService;

class ContactController extends BaseController
{
    public function submit()
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->redirect('/contacts');
        }

        if (!empty($_POST['b_honeypot'])) {
            return $this->handleResponse(false, 'Spam detected.', 403);
        }

        $data = $this->validateRequest([
            'name'    => FILTER_SANITIZE_SPECIAL_CHARS,
            'email'   => FILTER_VALIDATE_EMAIL,
            'subject' => FILTER_SANITIZE_SPECIAL_CHARS,
            'message' => FILTER_SANITIZE_SPECIAL_CHARS
        ]);

        if (!$data) {
            return $this->handleResponse(false, 'Моля, попълнете всички полета правилно.', 400);
        }

        $file = $this->validateFiles('attachment', ['pdf', 'jpg', 'png', 'docx', 'zip']);

        if (is_array($file) && isset($file['error']) && $file['error'] !== 0 && $file['error'] !== UPLOAD_ERR_OK) {
            return $this->handleResponse(false, $file['error'], 400);
        }

        $data['subject'] = SERVICES[$data['subject']] ?? 'Общо запитване';

        $success = EmailService::send(
            env('SMTP_USER'),
            "Контактна форма: " . $data['subject'],
            'contact',
            $data,
            $file
        );

        $statusMsg = $success
            ? 'Благодаря! Съобщението ти беше изпратено успешно.'
            : 'Възникна грешка със сървъра. Моля, опитайте по-късно.';

        return $this->handleResponse($success, $statusMsg);
    }

    private function handleResponse(bool $success, string $message, int $code = 200)
    {
        if ($this->isAjax()) {
            $this->json([
                'status'  => $success ? 'success' : 'error',
                'message' => $message
            ], $code);
        }

        $this->flash($success ? 'success' : 'error', $message);
        $this->redirect('/contacts');
        exit;
    }
}