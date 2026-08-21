<h2>Добре дошли в <?= htmlspecialchars($companyName) ?>!</h2>
<p>Здравейте, <strong><?= htmlspecialchars($name) ?></strong>,</p>
<p>За да завършите вашата регистрация, моля потвърдете имейл адреса си:</p>

<div class="button-container">
    <a href="<?= htmlspecialchars($url) ?>" class="btn-primary" target="_blank">Потвърди имейла</a>
</div>

<p style="font-size: 14px; color: #64748b;">
    Ако бутонът не работи, копирайте този линк в браузъра си:<br>
    <a href="<?= htmlspecialchars($url) ?>"><?= htmlspecialchars($url) ?></a>
</p>

<p>Поздрави,<br>Екипът на <?= htmlspecialchars($companyName) ?></p>
