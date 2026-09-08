<!DOCTYPE html>
<html lang="bg">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars((string) ($emailTitle ?? $companyName)) ?></title>
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
        .code {
            letter-spacing: 8px;
            font-size: 32px;
            font-weight: 700;
            text-align: center;
            color: #0f172a;
            background: #f1f5f9;
            border-radius: 12px;
            padding: 18px 12px;
            margin: 24px 0;
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
        .warning {
            font-size: 12px;
            color: #94a3b8;
            border-top: 1px solid #f1f5f9;
            padding-top: 20px;
            margin-top: 20px;
        }
        .footer {
            background-color: #f1f5f9;
            padding: 28px 24px;
            text-align: center;
            font-size: 12px;
            line-height: 1.6;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
        }
        .footer p {
            margin: 4px 0;
        }
        .footer a {
            color: #2563eb;
            text-decoration: none;
        }
        .no-reply {
            font-weight: 700;
            color: #b91c1c;
            margin-bottom: 12px !important;
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <h1><?= htmlspecialchars((string) $companyName) ?></h1>
            </div>
            <div class="content">
                <?= $emailContent ?>
            </div>
            <?php include __DIR__ . '/partials/company-footer.php'; ?>
        </div>
    </div>
</body>
</html>
