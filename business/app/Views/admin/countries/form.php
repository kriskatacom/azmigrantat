<?php

use App\Modules\Form;
use App\Core\View;

$isEdit = $country->exists; // Проверяваме дали обектът съществува в БД
$title = $isEdit ? 'Редактиране на държава' : 'Добавяне на нова държава';
$action = $isEdit ? "/admin/countries/update/{$country->id}" : "/admin/countries/store";
?>

<div class="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
    <div>
        <a href="/admin/countries" class="text-slate-500 hover:text-primary text-sm mb-2 flex items-center gap-2 transition-colors w-fit">
            <i class="fa-solid fa-arrow-left"></i> Назад към списъка
        </a>
        <h1 class="text-2xl font-bold text-slate-900"><?= $title ?></h1>
        <p class="text-sm font-medium text-slate-500">
            <?= $isEdit ? "Промяна на информацията за '" . htmlspecialchars($country->name) . "'" : "Създаване на нова държава в системата." ?>
        </p>
    </div>
</div>

<?php View::component('flash-messages', 'admin/components'); ?>

<form action="<?= $action ?>" method="POST" class="grid 2xl:grid-cols-3 gap-5" enctype="multipart/form-data">

    <div class="xl:col-span-2 space-y-5">

        <?php Form::section('Основна информация', function () use ($country) { ?>
            <div class="grid xl:grid-cols-2 gap-5">
                <?php Form::input('Име на държавата', 'name', $country->name ?? '', 'text', [
                    'required' => true,
                    'placeholder' => 'напр. България'
                ]); ?>

                <?php Form::input('URL адрес (Slug)', 'slug', $country->slug ?? '', 'text', [
                    'placeholder' => 'bulgaria',
                    'help' => 'Генерира се автоматично от името, ако е празно.'
                ]); ?>
            </div>

            <?php Form::input('Заглавие (Heading)', 'heading', $country->heading ?? '', 'text', [
                'placeholder' => 'Добре дошли в красива България',
                'help' => 'Главното H1 заглавие върху Hero секцията на държавата.'
            ]); ?>

            <?php Form::textarea('Кратко описание (Excerpt)', 'excerpt', $country->excerpt ?? '', [
                'required' => true,
                'placeholder' => 'Кратко резюме или описание на държавата...',
                'help' => 'Визуализира се в списъците с държави и картички.'
            ]); ?>
        <?php }, 'fa-globe'); ?>

        <?php Form::section('Визуализация и Дизайн', function () use ($country) { ?>
            <div class="space-y-4">
                <?php Form::select('Шаблон на изгледа (Layout)', 'layout', [
                    'secondary' => 'Стандартен изглед (Secondary)',
                    'primary'   => 'Премиум / Главен изглед (Primary)'
                ], $country->layout ?? 'secondary', [
                    'help' => 'Определя структурата и стила на публичната страница.'
                ]); ?>

                <?php Form::input('Подредба (Sort Order)', 'sort_order', $country->sort_order ?? 0, 'number', [
                    'placeholder' => '0',
                    'help' => 'По-малките числа излизат по-напред (напр. 0, 1, 2).'
                ]); ?>
            </div>
        <?php }, 'fa-bezier-curve'); ?>

    </div>

    <div class="xl:col-span-1 space-y-6">

        <?php Form::section('Изображения на държавата', function () use ($country) { ?>
            <div class="grid grid-cols-1 gap-8">
                <?php
                Form::image('Основна снимка (Desktop)', 'image_url', $country->image_url ?? null, [
                    'help' => 'Основно изображение за десктоп версия.'
                ]);
                
                Form::image('Мобилна снимка (Mobile)', 'image_mobile_url', $country->image_mobile_url ?? null, [
                    'help' => 'Адаптирана по-малка снимка за телефони.'
                ]);
                ?>
            </div>
        <?php }, 'fa-images'); ?>

        <?php Form::section('Статус', function () use ($country) { ?>
            <div class="space-y-6">
                <div class="pb-2">
                    <?php Form::toggle('Активна държава', 'is_active', (bool)($country->is_active ?? true)); ?>
                    <p class="text-xs text-slate-400 mt-1">Ако е изключено, държавата няма да се вижда на сайта.</p>
                </div>
            </div>
        <?php }, 'fa-toggle-on'); ?>

        <?php if ($isEdit): ?>
            <div class="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div class="text-xs text-slate-400 space-y-1 font-medium">
                    <p><i class="fa-solid fa-calendar-plus mr-1"></i> Създадена на: <?= date('d.m.Y', strtotime($country->created_at)) ?></p>
                    <p><i class="fa-solid fa-pen-nib mr-1"></i> Последна промяна: <?= date('d.m.Y H:i', strtotime($country->updated_at)) ?></p>
                </div>
            </div>
        <?php endif; ?>

        <div class="pt-2">
            <?php Form::submit($isEdit ? 'Запази промените' : 'Създай държава', $isEdit ? 'fa-save' : 'fa-plus'); ?>
        </div>
    </div>
</form>