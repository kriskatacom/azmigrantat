<?php

use App\Modules\Form;
use App\Core\View;

$isEdit = $city->exists;
$title = $isEdit ? 'Редактиране на населено място' : 'Добавяне на нов град/село';
$action = $isEdit ? "/admin/cities/update/{$city->id}" : "/admin/cities/store";

$countriesList = \App\Models\Country::where('is_active', 1)->get();
$countryOptions = ['' => '-- Изберете държава --'];
foreach ($countriesList as $c) {
    $countryOptions[$c->id] = $c->name;
}
$currentCountryId = $city->options['country_id'] ?? '';
?>

<div class="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
    <div>
        <a href="/admin/cities" class="text-slate-500 hover:text-primary text-sm mb-2 flex items-center gap-2 transition-colors w-fit">
            <i class="fa-solid fa-arrow-left"></i> Назад към списъка
        </a>
        <h1 class="text-2xl font-bold text-slate-900"><?= $title ?></h1>
        <p class="text-sm font-medium text-slate-500">
            <?= $isEdit ? "Промяна на информацията за '" . htmlspecialchars($city->name) . "'" : "Създаване на ново населено място в йерархията на системата." ?>
        </p>
    </div>
</div>

<?php View::component('flash-messages', 'admin/components'); ?>

<form action="<?= $action ?>" method="POST" class="grid 2xl:grid-cols-3 gap-5" enctype="multipart/form-data">

    <div class="xl:col-span-2 space-y-5">

        <?php Form::section('Основна информация', function () use ($city) { ?>
            <div class="grid xl:grid-cols-2 gap-5">
                <?php Form::input('Име на населеното място', 'name', $city->name ?? '', 'text', [
                    'required' => true,
                    'placeholder' => 'напр. Пловдив'
                ]); ?>

                <?php Form::input('URL адрес (Slug)', 'slug', $city->slug ?? '', 'text', [
                    'placeholder' => 'plovdiv',
                    'help' => 'Генерира се автоматично, ако е празно.'
                ]); ?>
            </div>

            <?php Form::input('H1 Заглавие (Heading)', 'options[h1_title]', $city->options['h1_title'] ?? '', 'text', [
                'placeholder' => 'Добре дошли в Пловдив',
                'help' => 'Главното заглавие върху Hero секцията.'
            ]); ?>

            <?php Form::textarea('Кратко описание (Excerpt)', 'options[excerpt]', $city->options['excerpt'] ?? '', [
                'placeholder' => 'Кратко изречение под заглавието...',
                'help' => 'Визуализира се в списъците с градове.'
            ]); ?>
        <?php }, 'fa-city'); ?>

        <?php Form::section('Подробно описание', function () use ($city) { ?>
            <div class="space-y-4">
                <?php View::component('form-editor', 'admin/partials', [
                    'name'  => 'options[description]',
                    'label' => 'Текст на страницата',
                    'value' => $city->options['description'] ?? ''
                ]); ?>
            </div>
        <?php }, 'fa-pen-to-square'); ?>

        <?php Form::section('Карта и Навигация', function () use ($city) { ?>
            <div class="space-y-5">
                <?php Form::textarea('Google Maps (Embed Iframe)', 'options[map_embed]', $city->options['map_embed'] ?? '', [
                    'rows' => 3,
                    'placeholder' => '<iframe ...',
                    'help' => 'Поставете < iframe > кода от Google Maps.'
                ]); ?>

                <?php Form::input('Линк за навигация (Google Maps URL)', 'options[map_url]', $city->options['map_url'] ?? '', 'url', [
                    'placeholder' => 'https://google.com/maps/...',
                    'help' => 'Използва се за бутон "Отвори в Карти".'
                ]); ?>
            </div>
        <?php }, 'fa-map-location-dot'); ?>

        <?php Form::section('SEO Настройки', function () use ($city) { ?>
            <div class="space-y-6">
                <div class="grid gap-5">
                    <?php Form::input('Meta Title', 'options[seo_title]', $city->options['seo_title'] ?? '', 'text', [
                        'placeholder' => 'SEO заглавие...',
                        'help' => 'Ако е празно, ще се използва името.'
                    ]); ?>

                    <?php Form::textarea('Meta Description', 'options[seo_description]', $city->options['seo_description'] ?? '', [
                        'rows' => 3,
                        'placeholder' => 'Въведете мета описание за Google...'
                    ]); ?>
                </div>

                <div class="grid xl:grid-cols-2 gap-5">
                    <?php Form::input('SEO Keywords', 'options[seo_keywords]', $city->options['seo_keywords'] ?? '', 'text', [
                        'placeholder' => 'туризъм, история, хотел'
                    ]); ?>

                    <?php Form::image('Facebook / OG Image', 'options[seo_og_image]', $city->options['seo_og_image'] ?? null, [
                        'help' => 'Снимка при споделяне в социални мрежи.'
                    ]); ?>
                </div>
            </div>
        <?php }, 'fa-search'); ?>
    </div>

    <div class="xl:col-span-1 space-y-6">

        <?php Form::section('Адаптивни изображения', function () use ($city) { ?>
            <div class="grid grid-cols-1 gap-8">
                <?php
                Form::image('Десктоп (Desktop)', 'options[image_desktop]', $city->options['image_desktop'] ?? null);
                Form::image('Таблет (Tablet)', 'options[image_tablet]', $city->options['image_tablet'] ?? null);
                Form::image('Телефон (Phone)', 'options[image_phone]', $city->options['image_phone'] ?? null);
                ?>
            </div>
        <?php }, 'fa-images'); ?>

        <?php Form::section('Статус и йерархия', function () use ($city, $parentOptions, $countryOptions, $currentCountryId) { ?>
            <div class="space-y-6">
                <div class="pb-4 border-b border-slate-100">
                    <?php Form::toggle('Активно населено място', 'is_active', (bool)($city->is_active ?? true)); ?>
                </div>

                <div class="space-y-4">
                    <?php Form::select('Държава', 'options[country_id]', $countryOptions, $currentCountryId, [
                        'help' => 'Към коя държава принадлежи това населено място.'
                    ]); ?>

                    <?php Form::select('Тип на мястото', 'type', [
                        'region'  => 'Област / Регион / Община',
                        'city'    => 'Град',
                        'village' => 'Село'
                    ], $city->type ?? 'city'); ?>

                    <?php Form::select('Родител (Принадлежи към)', 'parent_id', $parentOptions, $city->parent_id ?? ''); ?>
                </div>
            </div>
        <?php }, 'fa-sitemap'); ?>

        <?php if ($isEdit): ?>
            <div class="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div class="text-xs text-slate-400 space-y-1 font-medium">
                    <p><i class="fa-solid fa-calendar-plus mr-1"></i> Създаден: <?= date('d.m.Y', strtotime($city->created_at)) ?></p>
                    <p><i class="fa-solid fa-pen-nib mr-1"></i> Последна промяна: <?= date('d.m.Y H:i', strtotime($city->updated_at)) ?></p>
                </div>
            </div>
        <?php endif; ?>

        <div class="pt-2">
            <?php Form::submit($isEdit ? 'Запази промените' : 'Създай населено място', $isEdit ? 'fa-save' : 'fa-plus'); ?>
        </div>
    </div>
</form>
