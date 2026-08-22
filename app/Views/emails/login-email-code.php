<h2>Здравейте, <?= htmlspecialchars($name) ?>,</h2>
<p>Получихме заявка за вход в профила ви. Въведете този код в приложението. Валиден е 10 минути:</p>
<div class="code"><?= htmlspecialchars($code) ?></div>
<?php if (!empty($otpOriginLines) && is_array($otpOriginLines)): ?>
    <p style="font-size: 12px; color: #94a3b8; word-break: break-all;">
        <?php foreach ($otpOriginLines as $line): ?>
            <?= htmlspecialchars((string) $line) ?><br>
        <?php endforeach; ?>
    </p>
<?php endif; ?>
<div class="warning">
    Ако вие не сте заявявали този вход, игнорирайте имейла и не въвеждайте кода.
</div>
