<?php

use App\Modules\Str;

$formatNumber = static fn ($value): string => number_format((float) $value, 0, ',', ' ');
$dailyByDay = [];
foreach ($dailyViews as $item) {
    $dailyByDay[(string) $item->day] = $item;
}

$days = [];
$today = new DateTimeImmutable('today');
for ($offset = 29; $offset >= 0; $offset--) {
    $day = $today->sub(new DateInterval("P{$offset}D"));
    $key = $day->format('Y-m-d');
    $days[] = [
        'key' => $key,
        'label' => $day->format('d.m'),
        'views' => (int) ($dailyByDay[$key]->views ?? 0),
        'viewers' => (int) ($dailyByDay[$key]->viewers ?? 0),
    ];
}
?>

<div class="flex flex-col gap-8">
    <div class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
            <p class="text-sm font-bold uppercase tracking-wider text-primary">Анализ на съдържанието</p>
            <h1 class="mt-1 text-3xl font-black text-slate-900">Статистика</h1>
            <p class="mt-2 text-slate-500">Обобщение на гледанията на всички готови видеа в приложението.</p>
        </div>
        <div class="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500">
            Последните 30 дни
        </div>
    </div>

    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <?php foreach ([
            ['label' => 'Общо гледания', 'value' => $formatNumber($stats['total_views']), 'icon' => 'fa-eye', 'color' => 'blue'],
            ['label' => 'Уникални зрители', 'value' => $formatNumber($stats['unique_viewers']), 'icon' => 'fa-users', 'color' => 'emerald'],
            ['label' => 'Готови видеа', 'value' => $formatNumber($stats['video_count']), 'icon' => 'fa-video', 'color' => 'violet'],
            ['label' => 'Средно на видео', 'value' => $formatNumber($stats['average_views']), 'icon' => 'fa-chart-line', 'color' => 'amber'],
            ['label' => 'Активни създатели', 'value' => $formatNumber($stats['creators']), 'icon' => 'fa-user-pen', 'color' => 'rose'],
        ] as $card): ?>
            <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div class="flex items-start justify-between">
                    <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-<?= $card['color'] ?>-50 text-<?= $card['color'] ?>-600">
                        <i class="fa-solid <?= $card['icon'] ?> text-xl"></i>
                    </div>
                    <span class="text-xs font-bold uppercase tracking-wide text-slate-400">Показател</span>
                </div>
                <div class="mt-5 text-3xl font-black tabular-nums text-slate-900"><?= htmlspecialchars($card['value']) ?></div>
                <div class="mt-1 text-sm font-bold text-slate-500"><?= htmlspecialchars($card['label']) ?></div>
            </div>
        <?php endforeach; ?>
    </div>

    <div class="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-3">
            <div class="flex items-center justify-between gap-4">
                <div>
                    <h2 class="text-xl font-black text-slate-900">Активност по дни</h2>
                    <p class="mt-1 text-sm text-slate-500">Общ брой гледания и уникални зрители.</p>
                </div>
                <i class="fa-solid fa-chart-column text-xl text-primary"></i>
            </div>
            <div class="mt-8 flex h-64 items-end gap-1 border-b border-slate-200 pb-0">
                <?php foreach ($days as $day): ?>
                    <?php $height = $day['views'] > 0 ? max(5, (int) round(($day['views'] / $maxDailyViews) * 100)) : 2; ?>
                    <div class="group relative flex h-full flex-1 items-end" title="<?= htmlspecialchars($day['label'] . ': ' . $day['views'] . ' гледания') ?>">
                        <div class="w-full rounded-t-md bg-primary/80 transition group-hover:bg-primary" style="height: <?= $height ?>%"></div>
                        <div class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-xs font-semibold text-white group-hover:block">
                            <?= htmlspecialchars($day['label']) ?> · <?= $formatNumber($day['views']) ?> гледания
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
            <div class="mt-3 flex justify-between text-[10px] font-bold text-slate-400">
                <span><?= htmlspecialchars($days[0]['label']) ?></span>
                <span><?= htmlspecialchars($days[14]['label']) ?></span>
                <span><?= htmlspecialchars($days[29]['label']) ?></span>
            </div>
        </section>

        <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
            <div class="flex items-center justify-between gap-4">
                <div>
                    <h2 class="text-xl font-black text-slate-900">Най-гледани видеа</h2>
                    <p class="mt-1 text-sm text-slate-500">Топ 10 по общ брой гледания.</p>
                </div>
                <i class="fa-solid fa-ranking-star text-xl text-amber-500"></i>
            </div>
            <div class="mt-5 divide-y divide-slate-100">
                <?php if ($topVideos->isEmpty()): ?>
                    <p class="py-8 text-center text-sm text-slate-400">Все още няма готови видеа.</p>
                <?php else: ?>
                    <?php foreach ($topVideos as $index => $video): ?>
                        <div class="flex items-center gap-3 py-3">
                            <span class="w-5 text-sm font-black text-slate-400">#<?= $index + 1 ?></span>
                            <div class="min-w-0 flex-1">
                                <div class="truncate font-bold text-slate-800"><?= htmlspecialchars((string) $video->title) ?></div>
                                <div class="mt-0.5 truncate text-xs text-slate-400"><?= htmlspecialchars((string) ($video->creator_name ?: 'Неизвестен създател')) ?></div>
                            </div>
                            <div class="text-right">
                                <div class="font-black tabular-nums text-slate-800"><?= $formatNumber($video->total_views) ?></div>
                                <div class="text-[11px] font-semibold text-slate-400">гледания</div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </section>
    </div>

    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between gap-4">
            <div>
                <h2 class="text-xl font-black text-slate-900">Обхват на съдържанието</h2>
                <p class="mt-1 text-sm text-slate-500">Допълнителни показатели за текущото видео съдържание.</p>
            </div>
            <i class="fa-solid fa-bullseye text-xl text-emerald-500"></i>
        </div>
        <div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div class="rounded-xl bg-slate-50 p-4">
                <div class="text-xs font-bold uppercase tracking-wide text-slate-400">Средно гледания на зрител</div>
                <div class="mt-2 text-2xl font-black tabular-nums text-slate-900"><?= $stats['unique_viewers'] > 0 ? $formatNumber($stats['total_views'] / $stats['unique_viewers']) : '0' ?></div>
            </div>
            <div class="rounded-xl bg-slate-50 p-4">
                <div class="text-xs font-bold uppercase tracking-wide text-slate-400">Последна активност</div>
                <div class="mt-2 text-2xl font-black text-slate-900"><?= $dailyViews->isEmpty() ? 'Няма данни' : htmlspecialchars((string) $dailyViews->last()->day) ?></div>
            </div>
        </div>
    </section>
</div>
