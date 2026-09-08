<h2>Здравейте, <?= htmlspecialchars($name) ?>,</h2>
<p>Получихме заявка за възстановяване на паролата. Въведете този код в приложението. Валиден е 15 минути:</p>
<div class="code"><?= htmlspecialchars($code) ?></div>
<?php if (!empty($otpOriginLines) && is_array($otpOriginLines)): ?>
    <p style="font-size: 12px; color: #94a3b8; word-break: break-all;">
        <?php foreach ($otpOriginLines as $line): ?>
            <?= htmlspecialchars((string) $line) ?><br>
        <?php endforeach; ?>
    </p>
<?php endif; ?>
<div class="warning">
    Ако вие не сте заявявали тази промяна, игнорирайте този имейл. Никой от екипа няма да ви поиска този код.
</div>
<p>Поздрави,<br>Екипът на <?= htmlspecialchars((string) $companyName) ?></p>
