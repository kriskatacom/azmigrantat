<section class="mx-auto max-w-xl px-5 py-20 text-center">
    <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full <?= $success ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-700' ?> text-2xl">
        <i class="fa-solid <?= $success ? 'fa-check' : 'fa-circle-info' ?>"></i>
    </div>
    <h1 class="mt-6 text-3xl font-black text-slate-900"><?= htmlspecialchars($heading) ?></h1>
    <p class="mt-3 text-slate-600"><?= htmlspecialchars($message) ?></p>
    <?php if ($returnUrl): ?>
        <a href="<?= htmlspecialchars($returnUrl) ?>" class="mt-8 inline-flex rounded-xl bg-primary px-6 py-3 font-bold text-white">
            Връщане в „Ето ме“
        </a>
    <?php endif; ?>
</section>

