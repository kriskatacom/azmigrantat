<!DOCTYPE html>
<html lang="bg">

<head>
    <meta charset="UTF-8">
</head>

<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa; color: #334155;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
        <div style="background-color: #4f46e5; padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: -0.025em;">Ново запитване</h1>
        </div>

        <div style="padding: 40px;">
            <div style="margin-bottom: 30px;">
                <p style="text-transform: uppercase; font-size: 11px; font-weight: 800; color: #64748b; margin-bottom: 8px;">Детайли на подателя</p>
                <p style="margin: 0; font-size: 16px;"><strong>Име:</strong> <?= $name ?></p>
                <p style="margin: 4px 0; font-size: 16px;"><strong>Имейл:</strong> <a href="mailto:<?= $email ?>" style="color: #4f46e5; text-decoration: none;"><?= $email ?></a></p>
                <p style="margin: 4px 0; font-size: 16px;"><strong>Тема:</strong> <?= $subject ?></p>
            </div>

            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 30px;">

            <div style="margin-bottom: 30px;">
                <p style="text-transform: uppercase; font-size: 11px; font-weight: 800; color: #64748b; margin-bottom: 8px;">Съобщение</p>
                <div style="background-color: #f8fafc; padding: 20px; border-radius: 16px; font-size: 16px; line-height: 1.6; color: #1e293b; border: 1px solid #f1f5f9;">
                    <?= nl2br($message) ?>
                </div>
            </div>

            <div style="text-align: center; font-size: 12px; color: #94a3b8;">
                Изпратено чрез контактната форма на kriskata.com<br>
                <?= date('d.m.Y H:i') ?>
            </div>
        </div>
    </div>
</body>

</html>
