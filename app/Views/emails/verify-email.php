<div style="font-family: sans-serif; line-height: 1.6; color: #333;">
    <h2 style="color: #2563eb;">Добре дошли в I the migrant!</h2>
    <p>Здравейте, <strong>
            <?= htmlspecialchars($name) ?>
        </strong>,</p>
    <p>За да завършите вашата регистрация, моля потвърдете имейл адреса си:</p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 30px 0;">
        <tr>
            <td style="border-radius: 6px; background: #2563eb; text-align: center;">
                <a href="<?= $url ?>"
                    style="background: #2563eb; border: 15px solid #2563eb; font-family: sans-serif; font-size: 16px; line-height: 1.5; text-align: center; text-decoration: none; display: block; border-radius: 6px; font-weight: bold; color: #ffffff;">
                    Потвърди имейла
                </a>
            </td>
        </tr>
    </table>

    <p style="font-size: 14px; color: #666;">Ако бутонът не работи, копирайте този линк в браузъра си:<br>
        <a href="<?= $url ?>" style="color: #2563eb;">
            <?= $url ?>
        </a>
    </p>

    <p>Поздрави,<br>Екипът на I the migrant</p>
</div>