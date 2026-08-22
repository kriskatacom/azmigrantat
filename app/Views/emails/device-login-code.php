<h2>Здравейте, <?= htmlspecialchars($name) ?>,</h2>
<p>Получихме заявка за вход от <?= htmlspecialchars($device_name ?? 'ново устройство') ?>. Въведете този код в приложението, ако нямате достъп до предишното си устройство. Валиден е 15 минути:</p>
<div class="code"><?= htmlspecialchars($code) ?></div>
<?php if (!empty($otpOriginLines) && is_array($otpOriginLines)): ?>
    <p style="font-size: 12px; color: #94a3b8; word-break: break-all;">
        <?php foreach ($otpOriginLines as $line): ?>
            <?= htmlspecialchars((string) $line) ?><br>
        <?php endforeach; ?>
    </p>
<?php endif; ?>
<div class="warning">
    Ако вие не сте заявявали този вход, игнорирайте имейла и не потвърждавайте устройството.
</div>
