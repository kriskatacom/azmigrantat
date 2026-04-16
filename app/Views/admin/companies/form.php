<?php

use App\Modules\Form;
use App\Core\View;

$isEdit = $company->exists;
$title = $isEdit ? 'Редактиране на компания' : 'Добавяне на нова компания';
$action = $isEdit ? "/admin/companies/update/{$company->id}" : "/admin/companies/store";
$companyOptions = $company->options ?? [];
?>

<div class="fixed bottom-5 right-5 z-50">
    <?php Form::mainSubmit(); ?>
</div>

<div class="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
    <div>
        <a href="/admin/companies" class="text-slate-500 hover:text-primary text-sm mb-2 flex items-center gap-2 transition-colors w-fit">
            <i class="fa-solid fa-arrow-left"></i> Назад към списъка
        </a>
        <h1 class="text-2xl font-bold text-slate-900"><?= $title ?></h1>
        <p class="text-sm font-medium text-slate-500">
            <?= $isEdit ? "Промяна на данните за '" . htmlspecialchars($company->name) . "'" : "Регистрация на нов бизнес профил в системата." ?>
        </p>
    </div>
</div>

<?php View::component('flash-messages', 'admin/components'); ?>

<form data-main-form action="<?= $action ?>" method="POST" class="grid 2xl:grid-cols-3 gap-5" enctype="multipart/form-data">

    <div class="xl:col-span-2 space-y-5">

        <?php Form::section('Основна информация', function () use ($company) { ?>
            <div class="grid xl:grid-cols-2 gap-5">
                <?php Form::input('Име на фирмата', 'name', $company->name ?? '', 'text', [
                    'required' => true,
                    'placeholder' => 'напр. Метал Замфирови ЕООД'
                ]); ?>

                <?php Form::input('URL адрес (Slug)', 'slug', $company->slug ?? '', 'text', [
                    'placeholder' => 'metal-zamfirovi-eood',
                    'help' => 'Генерира се автоматично, ако е празно.'
                ]); ?>
            </div>

            <?php Form::input('Слоган на компанията', 'company_slogan', $company->company_slogan ?? '', 'text', [
                'placeholder' => 'Качество и прецизност...',
                'help' => 'Кратко рекламно изречение.'
            ]); ?>

            <?php Form::textarea('Кратко извлечение (Excerpt)', 'excerpt', $company->excerpt ?? '', [
                'placeholder' => 'Кратко представяне за списъците...',
                'rows' => 2
            ]); ?>
        <?php }, 'fa-building'); ?>

        <?php Form::section('Представяне и Услуги', function () use ($company) { ?>
            <div class="space-y-6">
                <?php View::component('form-editor', 'admin/partials', [
                    'name'  => 'description',
                    'label' => 'Основно описание (За компанията)',
                    'value' => $company->description ?? ''
                ]); ?>

                <hr class="border-slate-100">

                <?php View::component('form-editor', 'admin/partials', [
                    'name'  => 'services_description',
                    'label' => 'Описание на услугите',
                    'value' => $company->services_description ?? ''
                ]); ?>
            </div>
        <?php }, 'fa-pen-to-square'); ?>

        <?php Form::section('Галерия (Допълнителни снимки)', function () use ($companyOptions) { ?>
            <div class="space-y-4">
                <?php
                $gallery = $companyOptions['additional_images'] ?? [];

                View::component('multi-image-upload', 'admin/components', [
                    'name'   => 'options[additional_images][]',
                    'images' => $gallery,
                    'label'  => 'Галерия на обекта'
                ]);
                ?>
            </div>
        <?php }, 'fa-images'); ?>

        <?php Form::section('Локация и Карта', function () use ($company) { ?>
            <div class="space-y-6">
                <div class="space-y-4">
                    <?php Form::input('Google Maps (Вградена карта)', 'google_map', $company->google_map ?? '', 'url', [
                        'id' => 'js-input-map-embed',
                        'icon' => 'fa-code',
                        'placeholder' => 'Линк или iframe код...',
                        'help' => 'Поставете целия iframe код или само src линка.'
                    ]); ?>

                    <div id="js-preview-map-container" class="<?= empty($company->google_map) ? 'hidden' : '' ?> bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <p class="text-xs font-bold text-slate-500 uppercase mb-2">Преглед на картата:</p>
                        <div class="aspect-video w-full rounded overflow-hidden shadow-sm bg-slate-200">
                            <iframe id="js-preview-iframe" src="<?= $company->google_map ?? '' ?>" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy"></iframe>
                        </div>
                    </div>
                </div>

                <hr class="border-slate-100">

                <div class="space-y-4">
                    <?php Form::input('Локация за навигация', 'options[google_map_link]', $company->options['google_map_link'] ?? '', 'url', [
                        'id' => 'js-input-map-link',
                        'icon' => 'fa-route',
                        'placeholder' => 'Линк към обект...',
                        'help' => 'Линк за бутона "Упътване".'
                    ]); ?>

                    <div id="js-preview-link-container" class="<?= empty($company->options['google_map_link']) ? 'hidden' : '' ?> bg-slate-50 p-6 rounded-lg border border-slate-200 flex flex-col items-center">
                        <p class="text-xs font-bold text-slate-500 uppercase mb-3">Визуализация на бутона:</p>
                        <a id="js-preview-route-btn" href="<?= $company->options['google_map_link'] ?? '#' ?>" target="_blank" class="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-blue-700 transition-all">
                            <i class="fa-solid fa-location-arrow"></i>
                            Виж маршрут до обекта
                        </a>
                    </div>
                </div>
            </div>
        <?php }, 'fa-map-location-dot'); ?>

        <?php Form::section('Работно време', function () use ($company) { ?>
            <div class="space-y-6">
                <?php View::component('form-editor', 'admin/partials', [
                    'name'  => 'working_time',
                    'label' => 'График',
                    'value' => $company->working_time ?? ''
                ]); ?>
                <hr class="border-slate-100">
            </div>
        <?php }, 'fa-clock'); ?>

    </div>

    <div class="xl:col-span-1 space-y-6">

        <?php
        $options = is_string($company->options) ? json_decode($company->options, true) : ($company->options ?? []);
        ?>

        <?php
        $companyOptions = is_string($company->options)
            ? json_decode($company->options, true)
            : ($company->options ?? []);
        ?>
        <?php Form::section('Адаптивни предни изображения', function () use ($companyOptions) { ?>
            <div class="grid grid-cols-1 gap-8">
                <?php
                Form::image('Основна снимка (Desktop)', 'options[image_url]', $companyOptions['image_url'] ?? null, [
                    'help' => 'Основно изображение за големи екрани.'
                ]);
                Form::image('Таблет (Tablet)', 'options[image_tablet]', $companyOptions['image_tablet'] ?? null);
                Form::image('Телефон (Phone)', 'options[image_mobile]', $companyOptions['image_mobile'] ?? null);
                ?>
            </div>
        <?php }, 'fa-display'); ?>

        <?php Form::section('Default изображения (Системни)', function () use ($companyOptions) { ?>
            <div class="grid grid-cols-1 gap-8">
                <?php
                Form::image('Изображение за реклами и обяви', 'options[ads_image_url]', $companyOptions['ads_image_url'] ?? null, [
                    'help' => 'Изображение по подразбиране за списъка с реклами и обяви.'
                ]);
                Form::image('Изображение за Услуги', 'options[offer_image_url]', $companyOptions['offer_image_url'] ?? null, [
                    'help' => 'Изображение по подразбиране за списъка с услуги.'
                ]);
                Form::image('Изображение за Footer', 'options[bottom_image_url]', $companyOptions['bottom_image_url'] ?? null, [
                    'help' => 'Изображение, което се визуализира най-долу в профила.'
                ]);
                ?>
            </div>
        <?php }, 'fa-layer-group'); ?>

        <?php Form::section('Статус и Свързаност', function () use ($company, $cities, $categories, $users) { ?>
            <div class="space-y-5">
                <?php Form::toggle('Активен профил', 'is_active', (bool)($company->is_active ?? true)); ?>

                <hr class="border-slate-100">

                <?php
                $cityOptions = $cities->pluck('name', 'id')->toArray();
                Form::select('Град', 'city_id', $cityOptions, $company->city_id ?? '');

                $catOptions = is_array($categories) ? $categories : [];
                Form::select('Категория', 'category_id', $catOptions, $company->category_id ?? '');

                $userOptions = $users->pluck('name', 'id')->toArray();
                Form::select('Собственик (User)', 'user_id', $userOptions, $company->user_id ?? '');
                ?>

                <?php Form::input('Подредба', 'sort_order', $company->sort_order ?? 0, 'number'); ?>
            </div>
        <?php }, 'fa-sitemap'); ?>

        <?php Form::section('Контакти', function () use ($company) { ?>
            <div class="space-y-4">
                <?php Form::input('Телефон', 'phone', $company->phone ?? '', 'text', [
                    'icon' => 'fa-phone',
                    'placeholder' => '+359 8XX XXX XXX'
                ]); ?>

                <?php Form::input('Email', 'email', $company->email ?? '', 'email', [
                    'icon' => 'fa-envelope',
                    'placeholder' => 'office@company.com'
                ]); ?>

                <?php Form::input('Уебсайт', 'website_link', $company->website_link ?? '', 'url', [
                    'icon' => 'fa-globe',
                    'placeholder' => 'https://www.website.com'
                ]); ?>

                <?php Form::input('Точен адрес', 'address', $company->address ?? '', 'text', [
                    'icon' => 'fa-map-marker-alt',
                    'placeholder' => 'гр. Монтана, ул. Индустриална 1'
                ]); ?>
            </div>
        <?php }, 'fa-address-book'); ?>

        <?php Form::section('Facebook страница', function () use ($company) { ?>
            <div class="space-y-4">
                <?php Form::input('Facebook Линк', 'facebook_page_link', $company->facebook_page_link ?? '', 'url', [
                    'icon' => 'fa-facebook',
                    'placeholder' => 'https://www.facebook.com/yourpage',
                    'help' => 'Facebook страницата ще се показва най-отдолу в страницата на компанията в клиентската зона.'
                ]); ?>
            </div>
        <?php }, 'fa-facebook'); ?>
    </div>
</form>

<script>
    (function() {
        const setupField = (inputSelector, containerSelector, previewSelector, type) => {
            const input = document.querySelector(inputSelector);
            const container = document.querySelector(containerSelector);
            const preview = document.querySelector(previewSelector);

            if (!input || !container || !preview) return;

            const extractUrl = (val) => {
                if (val.includes('<iframe')) {
                    const match = val.match(/src=["']([^"']+)["']/i);
                    return match ? match[1] : val;
                }
                return val;
            };

            const updatePreview = () => {
                console.log(input);
                const rawValue = input.value ? input.value.trim() : '';
                const cleanUrl = extractUrl(rawValue);


                if (cleanUrl && cleanUrl.startsWith('http')) {
                    if (type === 'src') preview.src = cleanUrl;
                    if (type === 'href') preview.href = cleanUrl;
                    container.classList.remove('hidden');
                } else {
                    container.classList.add('hidden');
                    if (type === 'src') preview.src = '';
                }
            };

            const cleanInputOnBlur = () => {
                console.log(0);

                const rawValue = input.value ? input.value.trim() : '';
                const cleanUrl = extractUrl(rawValue);
                if (rawValue !== cleanUrl) {
                    input.value = cleanUrl;
                }
            };

            input.addEventListener('input', updatePreview);
            input.addEventListener('blur', cleanInputOnBlur);

            if (input.value) updatePreview();
        };

        const init = () => {
            setupField('#js-input-map-embed input', '#js-preview-map-container', '#js-preview-iframe', 'src');
            setupField('#js-input-map-link input', '#js-preview-link-container', '#js-preview-route-btn', 'href');
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    })();
</script>
