<?php

use App\Modules\Form;
use App\Core\View;

$isEdit = $redirect->exists; ?>

<div class="fixed bottom-5 right-5 z-50">
    <?php Form::mainSubmit(); ?>
</div>

<div class="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
    <div>
        <a href="/admin/redirects" class="text-slate-500 hover:text-primary text-sm mb-2 flex items-center gap-2 transition-colors">
            <i class="fa-solid fa-arrow-left"></i> Назад към списъка
        </a>
        <h1 class="text-2xl font-bold text-slate-900">
            <?= $isEdit ? "Редактиране на пренасочване" : "Ново пренасочване" ?>
        </h1>
        <p class="text-sm font-medium text-slate-500">
            <?= $isEdit ? "Управление на автоматично препращане за '{$redirect->old_path}'" : "Добавяне на нов запис за автоматично пренасочване на трафик." ?>
        </p>
    </div>

    <?php if ($isEdit): ?>
        <div class="flex gap-2">
            <form action="/admin/redirects/reset-stats/<?= $redirect->id ?>" method="POST" onsubmit="return confirm('Наистина ли искате да нулирате статистиката?');">
                <button type="submit" class="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-50 hover:text-orange-600 transition-all shadow-sm">
                    <i class="fa-solid fa-arrows-rotate"></i>
                    Нулирай статистиката
                </button>
            </form>
        </div>
    <?php endif; ?>
</div>

<?php View::component('flash-messages', 'admin/components'); ?>

<form data-main-form action="<?= $isEdit ? "/admin/redirects/update/{$redirect->id}" : "/admin/redirects/store" ?>" method="POST" class="grid grid-cols-1 2xl:grid-cols-10 gap-5">

    <div class="col-span-10 2xl:col-span-6 space-y-5">
        <?php Form::section('Конфигурация на пътищата', function () use ($redirect) { ?>
            <div class="grid grid-cols-1 gap-5">
                <?php Form::input('Стар URL адрес (Откъде)', 'old_path', $redirect->old_path ?? '', 'text', [
                    'placeholder' => '/stara-stranica-ili-kategoria',
                    'required' => true,
                    'help' => 'Пътят, който потребителите достъпват (трябва да започва с /).'
                ]); ?>

                <?php Form::input('Нов URL адрес (Закъде)', 'new_path', $redirect->new_path ?? '', 'text', [
                    'placeholder' => '/nova-destinacia или https://drug-sait.com',
                    'required' => true,
                    'help' => 'Пълният адрес или вътрешен път, към който да се пренасочи трафика.'
                ]); ?>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                <?php Form::select('HTTP Статус Код', 'status_code', [
                    301 => '301 - Постоянно преместен (SEO Friendly)',
                    302 => '302 - Временно преместен'
                ], $redirect->status_code ?? 301, [
                    'help' => 'Използвайте 301 за постоянни промени в структурата на сайта.'
                ]); ?>

                <?php Form::input('Категория / Таг', 'category', $redirect->category ?? 'general', 'text', [
                    'placeholder' => 'Напр. marketing, migration, products',
                    'help' => 'За вътрешно групиране на редиректите.'
                ]); ?>
            </div>
        <?php }, 'fa-route'); ?>

        <?php Form::section('Допълнителна информация', function () use ($redirect) { ?>
            <div class="space-y-4">
                <?php Form::textarea('Бележки / Описание', 'description', $redirect->description ?? '', [
                    'placeholder' => 'Защо е създаден този редирект? (Напр. Изтрит продукт, стара кампания и т.н.)',
                    'rows' => 4
                ]); ?>
            </div>
        <?php }, 'fa-note-sticky'); ?>
    </div>

    <div class="col-span-10 2xl:col-span-4 space-y-5">

        <?php Form::section('Статус и Управление', function () use ($redirect) { ?>
            <div class="space-y-6">
                <div class="pb-2 border-b border-slate-100">
                    <?php Form::toggle('Пренасочването е активно', 'is_active', (bool)($redirect->is_active ?? true)); ?>
                </div>

                <p class="text-xs text-slate-500 italic">
                    <i class="fa-solid fa-circle-info mr-1"></i>
                    Ако деактивирате пренасочването, системата ще спре да препраща потребителите, но ще запази записа за бъдеща справка.
                </p>
            </div>
        <?php }, 'fa-toggle-on'); ?>

        <?php if ($isEdit): ?>
            <?php Form::section('Подробни данни (Статистика)', function () use ($redirect) { ?>
                <div class="space-y-4">
                    <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <span class="text-sm font-medium text-slate-600">Общо изпълнения (Hits):</span>
                        <span class="text-lg font-bold text-primary"><?= number_format($redirect->hits_count) ?></span>
                    </div>

                    <div class="space-y-2">
                        <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Последно използвано на:</label>
                        <div class="text-sm text-slate-700 bg-white p-2 rounded border border-slate-100">
                            <i class="fa-regular fa-clock mr-1 text-slate-400"></i>
                            <?= $redirect->last_used_at ? $redirect->last_used_at->format('d.m.Y H:i:s') : 'Никога' ?>
                        </div>
                    </div>

                    <div class="space-y-2 pt-2">
                        <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Създадено от:</label>
                        <div class="text-sm text-slate-700">
                            <i class="fa-solid fa-user-shield mr-1 text-slate-400"></i>
                            <?= $redirect->user ? $redirect->user->name : 'Системен запис' ?>
                        </div>
                    </div>
                </div>
            <?php }, 'fa-chart-line'); ?>
        <?php endif; ?>

    </div>
</form>
