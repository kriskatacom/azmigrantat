<?php
$websiteHost = preg_replace('#^https?://#', '', (string) $companyWebsite);
?>
<div class="footer">
    <?php if (!empty($emailNoReply)): ?>
        <p class="no-reply">Моля, не отговаряйте на този имейл. Използва се само за автоматични съобщения.</p>
    <?php endif; ?>

    <p><strong><?= htmlspecialchars((string) $companyLegalName) ?></strong></p>

    <?php if (!empty($companyLegalForm)): ?>
        <p><?= htmlspecialchars((string) $companyLegalForm) ?></p>
    <?php endif; ?>

    <?php if (!empty($companyStatus)): ?>
        <p>Статус: <?= htmlspecialchars((string) $companyStatus) ?></p>
    <?php endif; ?>

    <p>ЕИК: <?= htmlspecialchars((string) $companyEik) ?> · ДДС №: <?= htmlspecialchars((string) $companyVat) ?></p>

    <?php if (!empty($companyVatRegisteredAt)): ?>
        <p>ДДС регистрация: <?= htmlspecialchars((string) $companyVatRegisteredAt) ?></p>
    <?php endif; ?>

    <?php if (!empty($companyRegisteredAt)): ?>
        <p>Регистрация: <?= htmlspecialchars((string) $companyRegisteredAt) ?></p>
    <?php endif; ?>

    <?php if (!empty($companyCapital)): ?>
        <p>Капитал: <?= htmlspecialchars((string) $companyCapital) ?></p>
    <?php endif; ?>

    <p>Седалище: <?= htmlspecialchars((string) $companyAddress) ?></p>

    <?php if (!empty($companyOfficeAddress)): ?>
        <p>Офис: <?= htmlspecialchars((string) $companyOfficeAddress) ?></p>
    <?php endif; ?>

    <p>Управител: <?= htmlspecialchars((string) $companyManager) ?></p>

    <?php if (!empty($companyOwner)): ?>
        <p>Собственик: <?= htmlspecialchars((string) $companyOwner) ?></p>
    <?php endif; ?>

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
