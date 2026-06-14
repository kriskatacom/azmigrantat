<?php

namespace App\Services;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class EmailService
{
    public static function send(string $to, string $subject, string $template, array $data = [], $file = null): bool
    {
        $mail = new PHPMailer(true);

        try {
            $mail->isSMTP();
            $mail->Host = env('SMTP_HOST', 'localhost');
            $mail->SMTPAuth = env('SMTP_AUTH') === 'true';
            $mail->Username = env('SMTP_USER');
            $mail->Password = env('SMTP_PASS');
            $mail->Port = (int) env('SMTP_PORT', 587);
            $mail->CharSet = 'UTF-8';
            $mail->SMTPAuth = true;

            $mail->Hostname = env('SMTP_DOMAIN');
            $mail->Helo = env('SMTP_DOMAIN');

            $secure = env('SMTP_SECURE');
            if ($secure === 'tls') {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            } elseif ($secure === 'ssl') {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            }

            $mail->setFrom(env('SMTP_USER'), 'I the migrant');
            $mail->addAddress($to);

            if (isset($data['email'])) {
                $mail->addReplyTo($data['email'], $data['name'] ?? '');
            }

            $templatePath = __DIR__ . "/../Views/emails/{$template}.php";
            ob_start();
            extract($data);
            include $templatePath;
            $htmlBody = ob_get_clean();

            if ($file && is_array($file) && isset($file['tmp_name'])) {
                $mail->addAttachment($file['tmp_name'], $file['name']);
            }

            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body = $htmlBody;
            $mail->AltBody = strip_tags(str_replace(['<br>', '<br/>'], "\n", $htmlBody));

            return $mail->send();
        } catch (Exception $e) {
            var_dump("Mail Error: " . $mail->ErrorInfo);
            exit;
            error_log("Mail Error: " . $mail->ErrorInfo);
            return false;
        }
    }
}