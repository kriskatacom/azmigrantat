<?php
$websiteHost = preg_replace('#^https?://#', '', (string) $companyWebsite);
?>
<div class="footer">
    <?php if (!empty($emailNoReply)): ?>
        <p class="no-reply">Моля, не отговаряйте на този имейл. Използва се само за автоматични съобщения.</p>
    <?php endif; ?>

    <p><strong><?= htmlspecialchars((string) $companyLegalName) ?></strong></p>
    <p>ЕИК: <?= htmlspecialchars((string) $companyEik) ?> · ДДС №: <?= htmlspecialchars((string) $companyVat) ?></p>
    <p>Седалище: <?= htmlspecialchars((string) $companyAddress) ?></p>
    <p>Управител: <?= htmlspecialchars((string) $companyManager) ?></p>

    <?php if (!empty($companyPhone)): ?>
        <p>Телефон: <?= htmlspecialchars((string) $companyPhone) ?></p>
    <?php endif; ?>

    <?php if (!empty($companyEmail)): ?>
        <p>Имейл: <a href="mailto:<?= htmlspecialchars((string) $companyEmail) ?>"><?= htmlspecialchars((string) $companyEmail) ?></a></p>
    <?php endif; ?>

    <?php if (!empty($companyWebsite)): ?>
        <p>
            <a href="<?= htmlspecialchars((string) $companyWebsite) ?>" target="_blank">
                <?= htmlspecialchars((string) $websiteHost) ?>
            </a>
        </p>
    <?php endif; ?>
</div>
