<!DOCTYPE html>
<html lang="bg">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Възстановяване на парола</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f8fafc;
            margin: 0;
            padding: 0;
            color: #334155;
        }
        .wrapper {
            width: 100%;
            background-color: #f8fafc;
            padding: 40px 0;
        }
        .container {
            max-width: 600px;
            background-color: #ffffff;
            margin: 0 auto;
            border-radius: 16px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
            overflow: hidden;
        }
        .header {
            background-color: #0B2935;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 24px;
            font-weight: 700;
        }
        .content {
            padding: 40px 30px;
            line-height: 1.6;
        }
        .content h2 {
            color: #0f172a;
            font-size: 20px;
            margin-top: 0;
        }
        .button-container {
            text-align: center;
            margin: 30px 0;
        }
        .btn-primary {
            background-color: #2563eb;
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 30px;
            font-weight: 600;
            border-radius: 8px;
            display: inline-block;
        }
        .btn-primary:hover {
            background-color: #1d4ed8;
        }
        .warning {
            font-size: 12px;
            color: #94a3b8;
            border-top: 1px solid #f1f5f9;
            padding-top: 20px;
            margin-top: 20px;
        }
        .footer {
            background-color: #f1f5f9;
            padding: 30px;
            text-align: center;
            font-size: 13px;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
        }
        .footer p {
            margin: 6px 0;
        }
        .footer a {
            color: #2563eb;
            text-decoration: none;
        }
        .footer a:hover {
            text-decoration: underline;
        }
        .no-reply {
            font-weight: bold;
            color: #ef4444;
            margin-bottom: 15px !important;
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <h1><?= htmlspecialchars($companyName) ?></h1>
            </div>

            <div class="content">
                <h2>Здравейте, <?= htmlspecialchars($name) ?>,</h2>
                <p>Получихме заявка за възстановяване на паролата за вашия профил. Можете да създадете нова парола, като кликнете върху бутона по-долу:</p>
                
                <div class="button-container">
                    <a href="<?= $resetUrl ?>" class="btn-primary" target="_blank">Възстановяване на парола</a>
                </div>

                <p>Ако бутонът не работи, копирайте и поставете следния линк във вашия браузър:</p>
                <p style="word-break: break-all;"><a href="<?= $resetUrl ?>"><?= $resetUrl ?></a></p>

                <div class="warning">
                    Ако вие не сте заявявали тази промяна, моля, игнорирайте този имейл. Линкът е валиден за ограничено време.
                </div>
            </div>

            <div class="footer">
                <p class="no-reply">⚠️ Моля, не отговаряйте на този имейл. Този адрес се използва само за автоматични съобщения.</p>
                <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 15px 0;">
                <p><strong>Фирма:</strong> <?= htmlspecialchars($companyName) ?></p>
                <p><strong>Телефон за връзка:</strong> <?= htmlspecialchars($phone) ?></p>
                <p><strong>Уебсайт:</strong> <a href="<?= $siteUrl ?>" target="_blank"><?= str_replace(['https://', 'http://'], '', $siteUrl) ?></a></p>
            </div>
        </div>
    </div>
</body>
</html>