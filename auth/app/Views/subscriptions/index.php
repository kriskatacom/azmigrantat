<?php

use App\Core\View;
use App\Helpers\SecurityHelper;

$activePlan = $subscription && in_array($subscription->status, ['active', 'trialing'], true)
    ? $subscription->plan
    : 'free';
$selectedPlan = $selectedPlan ?? null;
?>

<div class="bg-slate-50 py-12 md:py-20">
    <div class="container mx-auto max-w-7xl px-5">
        <?php View::component('flash-messages', 'components'); ?>

        <div class="mx-auto max-w-3xl text-center">
            <span class="inline-flex items-center gap-2 rounded-full bg-secondary/30 px-4 py-2 text-sm font-bold text-primary">
                <i class="fa-solid fa-sparkles"></i> Short-video планове
            </span>
            <h1 class="mt-5 text-4xl font-black tracking-tight text-slate-900 md:text-5xl">Създавай повече. Достигай повече.</h1>
            <p class="mt-5 text-lg leading-8 text-slate-600">Избери план според начина, по който създаваш и споделяш видео съдържание.</p>
        </div>

        <div class="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-4">
            <?php foreach ($plans as $key => $plan): ?>
                <?php $isPopular = $key === 'creator_plus'; $isCurrent = $activePlan === $key; ?>
                <article class="relative flex flex-col rounded-3xl border-2 <?= $isPopular ? 'border-sky-400 shadow-xl shadow-sky-100' : 'border-slate-200' ?> <?= $selectedPlan === $key ? 'ring-4 ring-secondary/60' : '' ?> bg-white p-6">
                    <?php if ($isPopular): ?>
                        <span class="absolute -top-3 left-6 rounded-full bg-secondary px-3 py-1 text-xs font-black tracking-wide text-primary">НАЙ-ПОПУЛЯРЕН</span>
                    <?php endif; ?>
                    <?php if ($selectedPlan === $key): ?>
                        <span class="mb-3 inline-flex self-start rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700">Избран план</span>
                    <?php endif; ?>
                    <div class="flex items-center gap-3">
                        <div class="flex h-12 w-12 items-center justify-center rounded-2xl <?= $isPopular ? 'bg-secondary' : 'bg-sky-100' ?> text-xl text-sky-600">
                            <i class="fa-solid <?= $key === 'free' ? 'fa-leaf' : ($key === 'creator_pro' ? 'fa-rocket' : 'fa-wand-magic-sparkles') ?>"></i>
                        </div>
                        <div>
                            <h2 class="text-xl font-black text-slate-900"><?= htmlspecialchars($plan['name']) ?></h2>
                            <p class="text-2xl font-black text-slate-900"><?= $plan['price_cents'] === 0 ? 'Безплатен' : number_format($plan['price_cents'] / 100, 2, '.', '') . ' €' ?><span class="text-sm font-semibold text-slate-500"><?= $plan['price_cents'] === 0 ? '' : ' / месец' ?></span></p>
                        </div>
                    </div>
                    <p class="mt-5 min-h-12 text-sm leading-6 text-slate-500"><?= htmlspecialchars($plan['description']) ?></p>
                    <ul class="mt-5 flex-1 space-y-3 border-t border-slate-100 pt-5">
                        <?php foreach ($plan['features'] as $feature): ?>
                            <li class="flex gap-2 text-sm leading-5 text-slate-700"><i class="fa-solid fa-circle-check mt-0.5 text-sky-500"></i><span><?= htmlspecialchars($feature) ?></span></li>
                        <?php endforeach; ?>
                    </ul>
                    <div class="mt-7">
                        <?php if ($isCurrent): ?>
                            <div class="rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-bold text-emerald-700"><i class="fa-solid fa-check"></i> Текущ план</div>
                        <?php elseif ($plan['price_cents'] > 0): ?>
                            <form id="checkout-<?= htmlspecialchars($key) ?>" action="/subscriptions/checkout" method="POST">
                                <?= SecurityHelper::csrfField() ?>
                                <?= SecurityHelper::spamFields() ?>
                                <input type="hidden" name="plan" value="<?= htmlspecialchars($key) ?>">
                                <button type="submit" class="w-full rounded-xl bg-primary px-5 py-3 font-bold text-white transition hover:bg-darken-primary">Избери план</button>
                            </form>
                        <?php else: ?>
                            <div class="rounded-xl bg-slate-100 px-4 py-3 text-center text-sm font-bold text-slate-500">Без месечна такса</div>
                        <?php endif; ?>
                    </div>
                </article>
            <?php endforeach; ?>
        </div>

        <p class="mx-auto mt-10 max-w-3xl text-center text-sm leading-6 text-slate-500">Плащането се извършва в защитената страница на Stripe. Картовите данни не се въвеждат и не се съхраняват в нашия сайт.</p>
    </div>
</div>

<?php if ($selectedPlan && $activePlan !== $selectedPlan): ?>
    <script>
        window.addEventListener('DOMContentLoaded', function () {
            const form = document.getElementById('checkout-<?= htmlspecialchars($selectedPlan, ENT_QUOTES) ?>');
            if (form) form.submit();
        });
    </script>
<?php endif; ?>
