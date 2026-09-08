<?php
$emailNoReply = false;
$emailTitle = 'Ново запитване';
?>
<p style="text-transform: uppercase; font-size: 11px; font-weight: 800; color: #64748b; margin-bottom: 8px;">Детайли на подателя</p>
<p style="margin: 0; font-size: 16px;"><strong>Име:</strong> <?= htmlspecialchars((string) $name) ?></p>
<p style="margin: 4px 0; font-size: 16px;"><strong>Имейл:</strong> <a href="mailto:<?= htmlspecialchars((string) $email) ?>"><?= htmlspecialchars((string) $email) ?></a></p>
<p style="margin: 4px 0; font-size: 16px;"><strong>Тема:</strong> <?= htmlspecialchars((string) $subject) ?></p>

<hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;">

<p style="text-transform: uppercase; font-size: 11px; font-weight: 800; color: #64748b; margin-bottom: 8px;">Съобщение</p>
<div style="background-color: #f8fafc; padding: 20px; border-radius: 16px; font-size: 16px; line-height: 1.6; color: #1e293b; border: 1px solid #f1f5f9;">
    <?= nl2br(htmlspecialchars((string) $message)) ?>
</div>

<p style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 24px;">
    Изпратено чрез контактната форма · <?= date('d.m.Y H:i') ?>
</p>
