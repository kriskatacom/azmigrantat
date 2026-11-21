<?php
$configured = ($plan['configured'] ?? false) === true;
$amount = isset($plan['amount_cents'])
    ? number_format(((int) $plan['amount_cents']) / 100, 2, '.', '')
    : '';
$account = (string) ($plan['stripe_account_id'] ?? 'Не е свързан');
$priceId = (string) ($plan['stripe_price_id'] ?? 'Няма активна цена');
$mode = ($plan['stripe_mode'] ?? 'test') === 'live' ? 'LIVE' : 'SANDBOX';
$isActive = ($plan['is_active'] ?? false) === true;
?>

<div class="mx-auto max-w-4xl space-y-6">
    <div>
        <h1 class="text-2xl font-bold text-slate-900">Платен абонамент на „Ето ме“</h1>
        <p class="mt-2 text-sm text-slate-600">
            Цената важи за нови 30-дневни абонаменти. Съществуващите абонаменти запазват старата си цена и платен период.
        </p>
    </div>

    <?php if ($loadError): ?>
        <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <?= htmlspecialchars($loadError) ?>
        </div>
    <?php endif; ?>

    <section class="grid gap-4 md:grid-cols-4">
        <div class="rounded-2xl border border-slate-200 bg-white p-5">
            <div class="text-xs font-bold uppercase tracking-wide text-slate-400">Текуща цена</div>
            <div class="mt-2 text-3xl font-black text-slate-900">
                <?= $configured ? htmlspecialchars($amount) . ' €' : 'Не е зададена' ?>
            </div>
            <div class="mt-1 text-sm text-slate-500">за точно 30 дни</div>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-5">
            <div class="text-xs font-bold uppercase tracking-wide text-slate-400">Stripe режим</div>
            <div class="mt-2 text-xl font-black <?= $mode === 'SANDBOX' ? 'text-emerald-600' : 'text-red-600' ?>">
                <?= htmlspecialchars($mode) ?>
            </div>
            <div class="mt-2 break-all text-xs text-slate-500"><?= htmlspecialchars($account) ?></div>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-5">
            <div class="text-xs font-bold uppercase tracking-wide text-slate-400">Активна Stripe Price</div>
            <div class="mt-2 break-all font-mono text-sm font-semibold text-slate-700"><?= htmlspecialchars($priceId) ?></div>
            <div class="mt-2 text-xs text-slate-500">Версия <?= (int) ($plan['version'] ?? 0) ?></div>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-5">
            <div class="text-xs font-bold uppercase tracking-wide text-slate-400">Нови покупки</div>
            <div class="mt-2 text-xl font-black <?= $isActive ? 'text-emerald-600' : 'text-slate-500' ?>">
                <?= $isActive ? 'АКТИВНИ' : 'СПРЕНИ' ?>
            </div>
            <div class="mt-2 text-xs text-slate-500">Съществуващите абонаменти не се променят.</div>
        </div>
    </section>

    <?php if ($configured): ?>
        <form method="POST" action="/admin/subscription-plan" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken) ?>">
            <input type="hidden" name="operation" value="availability">
            <input type="hidden" name="expected_version" value="<?= (int) ($plan['version'] ?? 0) ?>">
            <input type="hidden" name="is_active" value="<?= $isActive ? '0' : '1' ?>">
            <input type="hidden" name="confirmed" value="1">
            <h2 class="text-lg font-black text-slate-900">Достъпност на платения план</h2>
            <p class="mt-2 text-sm text-slate-600">
                <?= $isActive
                    ? 'Спирането блокира само новите покупки. Вече платеният достъп остава валиден до края на периода.'
                    : 'Активирането отново разрешава нови Stripe Sandbox checkout-и с текущата цена.' ?>
            </p>
            <button type="submit" class="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl px-6 py-3 font-bold text-white <?= $isActive ? 'bg-slate-600' : 'bg-emerald-600' ?>">
                <?= $isActive ? 'Спри новите покупки' : 'Активирай платения план' ?>
            </button>
        </form>
    <?php endif; ?>

    <form id="paid-plan-form" method="POST" action="/admin/subscription-plan" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrfToken) ?>">
        <input type="hidden" name="operation" value="price">
        <input type="hidden" name="request_id" value="<?= htmlspecialchars($requestId) ?>">
        <input type="hidden" name="expected_version" value="<?= (int) ($plan['version'] ?? 0) ?>">
        <input id="confirmed" type="hidden" name="confirmed" value="0">

        <label for="amount_eur" class="block text-sm font-bold text-slate-800">Нова цена за 30 дни</label>
        <div class="mt-2 flex max-w-sm items-center rounded-xl border border-slate-300 bg-white px-4 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <input
                id="amount_eur"
                name="amount_eur"
                inputmode="decimal"
                required
                placeholder="напр. 5,00"
                value="<?= htmlspecialchars($amount) ?>"
                class="min-w-0 flex-1 border-0 bg-transparent py-3 text-lg font-bold outline-none"
            >
            <span class="font-bold text-slate-500">€ / 30 дни</span>
        </div>
        <p class="mt-2 text-xs text-slate-500">Допустима стойност: от 0,50 € до 1 000,00 €.</p>

        <div class="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            Stripe цените са непроменими. Записването създава нова Sandbox Price за бъдещи покупки и архивира старата за нови checkout-и.
        </div>

        <button type="submit" class="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 py-3 font-bold text-white hover:opacity-90">
            Преглед и потвърждение
        </button>
    </form>
</div>

<script>
document.getElementById('paid-plan-form').addEventListener('submit', function (event) {
    if (document.getElementById('confirmed').value === '1') return;
    event.preventDefault();
    const amount = document.getElementById('amount_eur').value.trim();
    const accepted = window.confirm(
        'Да създам ли нова Stripe Sandbox цена ' + amount +
        ' € за точно 30 дни? Промяната ще важи само за нови абонаменти.'
    );
    if (!accepted) return;
    document.getElementById('confirmed').value = '1';
    this.submit();
});
</script>
