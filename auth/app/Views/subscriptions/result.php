<div class="mx-auto max-w-2xl px-5 py-24 text-center">
    <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full <?= $success ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500' ?> text-3xl">
        <i class="fa-solid <?= $success ? 'fa-circle-check' : 'fa-arrow-left' ?>"></i>
    </div>
    <h1 class="mt-6 text-3xl font-black text-slate-900"><?= htmlspecialchars($title) ?></h1>
    <p class="mt-4 text-slate-600"><?= htmlspecialchars($description) ?></p>
    <a href="/subscriptions" class="mt-8 inline-flex rounded-xl bg-primary px-6 py-3 font-bold text-white hover:bg-darken-primary">Към плановете</a>
</div>
