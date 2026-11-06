<div class="p-6">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 class="text-2xl font-bold text-slate-900">Сигнали за модерация</h1>
        <nav class="flex flex-wrap gap-2">
            <?php foreach (['pending' => 'Чакащи', 'reviewing' => 'Преглеждани', 'resolved' => 'Решени', 'rejected' => 'Отхвърлени', 'all' => 'Всички'] as $value => $label): ?>
                <a class="rounded-lg px-3 py-2 text-sm font-semibold <?= $selectedStatus === $value ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700' ?>" href="/admin/moderation?status=<?= $value ?>"><?= $label ?></a>
            <?php endforeach; ?>
        </nav>
    </div>
    <div class="space-y-4">
        <?php foreach ($reports as $report): ?>
            <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div class="flex flex-wrap justify-between gap-3">
                    <div><strong>#<?= (int) $report->id ?></strong> · <?= htmlspecialchars($report->target_type) ?> #<?= htmlspecialchars((string) $report->target_id) ?> · <?= htmlspecialchars($report->reason) ?></div>
                    <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold"><?= htmlspecialchars($report->status) ?></span>
                </div>
                <p class="mt-2 text-sm text-slate-600">Подател: <?= htmlspecialchars($report->reporter?->email ?? 'изтрит') ?> · Докладван: <?= htmlspecialchars($report->reportedUser?->email ?? 'изтрит') ?> · <?= htmlspecialchars((string) $report->created_at) ?></p>
                <?php if ($report->details): ?><p class="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3"><?= htmlspecialchars($report->details) ?></p><?php endif; ?>
                <form method="POST" action="/admin/moderation/<?= (int) $report->id ?>" class="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                    <?= \App\Helpers\SecurityHelper::csrfField() ?>
                    <?= \App\Helpers\SecurityHelper::spamFields() ?>
                    <textarea name="moderator_notes" class="rounded-lg border border-slate-300 p-3" placeholder="Бележки на модератора"><?= htmlspecialchars($report->moderator_notes ?? '') ?></textarea>
                    <div class="flex items-end gap-2">
                        <button name="status" value="reviewing" class="rounded-lg bg-amber-500 px-3 py-2 font-semibold text-white">Преглежда се</button>
                        <button name="status" value="resolved" class="rounded-lg bg-green-600 px-3 py-2 font-semibold text-white">Решен</button>
                        <button name="status" value="rejected" class="rounded-lg bg-slate-600 px-3 py-2 font-semibold text-white">Отхвърлен</button>
                    </div>
                </form>
            </article>
        <?php endforeach; ?>
        <?php if ($reports->isEmpty()): ?><p class="rounded-xl bg-white p-6 text-slate-500">Няма сигнали в тази категория.</p><?php endif; ?>
    </div>
</div>
