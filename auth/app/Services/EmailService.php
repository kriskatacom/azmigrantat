<?php

namespace App\Services;

use App\Helpers\Company;
use PHPMailer\PHPMailer\PHPMailer;
use Throwable;

class EmailService
{
    public static function send(string $to, string $subject, string $template, array $data = [], $file = null): bool
    {
        $mail = new PHPMailer(true);

        try {
            $templatePath = __DIR__ . "/../Views/emails/{$template}.php";

            if (!is_file($templatePath)) {
                app_log('[Email] missing template=' . $template . ' path=' . $templatePath);
                return false;
            }

            $host = (string) env('SMTP_HOST', 'localhost');
            $user = (string) env('SMTP_USER', '');
            $port = (int) env('SMTP_PORT', 587);
            $secure = (string) env('SMTP_SECURE', '');
            $fromName = Company::name();

            $mail->isSMTP();
            $mail->Host = $host;
            $mail->SMTPAuth = filter_var(env('SMTP_AUTH', true), FILTER_VALIDATE_BOOLEAN);
            $mail->Username = $user;
            $mail->Password = (string) env('SMTP_PASS', '');
            $mail->Port = $port;
            $mail->CharSet = 'UTF-8';
            $mail->Encoding = PHPMailer::ENCODING_QUOTED_PRINTABLE;
            $mail->Timeout = 20;
            $mail->Hostname = (string) env('SMTP_DOMAIN', '');
            $mail->Helo = (string) env('SMTP_DOMAIN', '');

            if ($secure === 'tls') {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            } elseif ($secure === 'ssl') {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            }

            if ($user === '') {
                app_log('[Email] SMTP_USER is empty, cannot send to=' . $to);
                return false;
            }

            $mail->setFrom($user, $fromName);
            $mail->addAddress($to);

            if (isset($data['email'])) {
                $mail->addReplyTo($data['email'], $data['name'] ?? '');
            }

            $mailSubject = $subject;
            $vars = array_merge(Company::emailTemplateData(), $data);
            $vars['emailTitle'] = $vars['emailTitle'] ?? $mailSubject;
            $vars['emailNoReply'] = $vars['emailNoReply'] ?? true;

            extract($vars, EXTR_OVERWRITE);

            ob_start();
            include $templatePath;
            $emailContent = (string) ob_get_clean();

            ob_start();
            include __DIR__ . '/../Views/emails/layout.php';
            $htmlBody = (string) ob_get_clean();

            if ($file && is_array($file) && isset($file['tmp_name'])) {
                $mail->addAttachment($file['tmp_name'], $file['name']);
            }

            $mail->isHTML(true);
            $mail->Subject = $mailSubject;
            $mail->Body = $htmlBody;
            $mail->AltBody = self::plainTextBody($htmlBody, $vars);

            $sent = $mail->send();

            if (!$sent) {
                app_log(
                    '[Email] send returned false to=' . $to
                    . ' template=' . $template
                    . ' host=' . $host
                    . ' port=' . $port
                    . ' info=' . $mail->ErrorInfo
                );
            }

            return $sent;
        } catch (Throwable $exception) {
            app_log(
                '[Email] send failed to=' . $to
                . ' template=' . $template
                . ' class=' . $exception::class
                . ' message=' . $exception->getMessage()
                . ' phpmailer=' . ($mail->ErrorInfo ?? '')
            );

            return false;
        }
    }

    /**
     * @param array<string, mixed> $vars
     */
    private static function plainTextBody(string $htmlBody, array $vars): string
    {
        $text = html_entity_decode(
            strip_tags(str_replace(['<br>', '<br/>', '<br />', '</p>', '</div>'], "\n", $htmlBody)),
            ENT_QUOTES,
            'UTF-8'
        );
        $text = preg_replace("/[ \t]+/", ' ', $text) ?? $text;
        $text = preg_replace("/\n{3,}/", "\n\n", $text) ?? $text;
        $text = trim($text);

        $code = preg_replace('/\D/', '', (string) ($vars['otpCode'] ?? $vars['code'] ?? '')) ?? '';

        if (strlen($code) === 6) {
            $text .= "\n\n" . implode("\n", self::otpOriginLines($code));
        }

        return $text;
    }

    /**
     * @return list<string>
     */
    public static function otpOriginLines(string $code): array
    {
        $hosts = [
            defined('WEBSITE_DOMAIN_NAME') ? WEBSITE_DOMAIN_NAME : 'users.azmigrantat.com',
            preg_replace('#^https?://#', '', Company::website()) ?? 'azmigrantat.com',
        ];

        $lines = [];

        foreach (array_unique($hosts) as $host) {
            $host = preg_replace('#^https?://#', '', (string) $host) ?? '';
            $host = rtrim($host, '/');

            if ($host !== '') {
                $lines[] = '@' . $host . ' #' . $code;
            }
        }

        return $lines;
    }
}
