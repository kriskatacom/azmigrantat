<h2>Здравейте, <?= htmlspecialchars($name) ?>,</h2>
<p>Получихме заявка за възстановяване на паролата за вашия профил. Можете да създадете нова парола, като кликнете върху бутона по-долу:</p>

<div class="button-container">
    <a href="<?= htmlspecialchars($resetUrl) ?>" class="btn-primary" target="_blank">Възстановяване на парола</a>
</div>

<p>Ако бутонът не работи, копирайте и поставете следния линк във вашия браузър:</p>
<p style="word-break: break-all;"><a href="<?= htmlspecialchars($resetUrl) ?>"><?= htmlspecialchars($resetUrl) ?></a></p>

<div class="warning">
    Ако вие не сте заявявали тази промяна, моля, игнорирайте този имейл. Линкът е валиден за ограничено време.
</div>
