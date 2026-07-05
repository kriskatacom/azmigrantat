<?php

use App\Modules\TranslationManager;
use App\Modules\Form;
use App\Core\View;

$isEdit = $post->exists ?? false;
$categoryOptions = $categoryOptions ?? [];
$translatableConfig = $translatableConfig ?? [];
$translations = $translations ?? []; ?>

<div class="fixed bottom-5 right-5 z-50">
    <?php Form::mainSubmit(); ?>
</div>

<div class="mb-5 max-md:pt-5 max-md:px-5 space-y-2">
    <h1 class="text-xl md:text-2xl md:font-bold text-slate-900">
        <?= $isEdit ? "Редактиране на публикация" : "Нова публикация" ?>
    </h1>
    <a href="/admin/posts"
        class="text-slate-500 hover:text-primary flex items-center gap-2 transition-colors">
        <i class="fa-solid fa-arrow-left"></i> Назад към списъка
    </a>
</div>

<?php View::component('flash-messages', 'admin/components'); ?>

<form data-main-form action="<?= $isEdit ? "/admin/posts/update/{$post->id}" : "/admin/posts/store" ?>" method="POST"
    class="grid grid-cols-1 2xl:grid-cols-10 md:gap-5" enctype="multipart/form-data">

    <div class="col-span-10 2xl:col-span-6 space-y-5">

        <?php
        if (!empty($translatableConfig)): ?>
            <?php Form::section('Локализация и преводи', function () use ($translatableConfig, $translations) { ?>
                <div class="space-y-4">
                    <?= TranslationManager::renderFields($translatableConfig, $translations) ?>
                </div>
            <?php }, 'fa-language'); ?>
        <?php endif; ?>

        <?php
        Form::section('Основна информация', function () use ($post) { ?>
            <?php Form::input('Заглавие на публикацията', 'name', $post->name ?? '', 'text', [
                'placeholder' => 'Въведете заглавие...',
                'required' => true,
                'help' => 'Основно заглавие на публикацията.'
            ]); ?>
        <?php }, 'fa-newspaper'); ?>

        <?php Form::section('Основно изображение', function () use ($post) {
            Form::image('Качи изображение', 'options[main_image]', $post->options['main_image'] ?? null);
        }, 'fa-newspaper'); ?>

        <?php
        Form::section('Съдържание на публикацията', function () use ($post) { ?>
            <?php Form::textarea('Съдържание', 'content', $post->content ?? '', ['placeholder' => 'Въведете текста тук...', 'rows' => 5]); ?>
        <?php }, 'fa-pen-to-square'); ?>

        <?php Form::section('Галерия', function () use ($post) {
            $galleryImages = $post->images ?? [];
            Form::multiImage('Изображения', 'images', $galleryImages);
        }, 'fa-images'); ?>

        <?php Form::section('Видео съдържание', function () use ($post) { ?>
            <div class="space-y-4">
                <?php Form::video('Прикачено видео', 'video_url', $post->video_url ?? null); ?>
            </div>
        <?php }, 'fa-clapperboard'); ?>
    </div>

    <div class="col-span-10 2xl:col-span-4 space-y-5">

        <?php
        Form::section('Настройки на публикацията', function () use ($post, $categoryOptions) { ?>
            <div class="space-y-6">
                <div class="pb-4 border-b border-slate-100">
                    <?php Form::toggle('Публикацията е активна', 'is_active', (bool) ($post->is_active ?? true)); ?>
                </div>

                <?php View::component('select2', 'admin/partials', [
                    'label' => 'Категория',
                    'name' => 'category_id',
                    'options' => $categoryOptions,
                    'value' => $post->category_id ?? '',
                    'placeholder' => 'Изберете категория на публикацията...',
                    'allowClear' => true
                ]); ?>

                <?php if ($post->exists && $post->user): ?>
                    <div class="pt-4 border-t border-slate-100 text-slate-400 flex items-center gap-2">
                        <i class="fa-solid fa-user-nib"></i>
                        <span>Автор: <?= htmlspecialchars($post->user->name) ?>,
                            <?= htmlspecialchars($post->user->email) ?></span>
                    </div>
                <?php endif; ?>
            </div>
        <?php }, 'fa-gear'); ?>

        <?php Form::input('Локация (Адрес / Място)', 'location', $post->location ?? '', 'text', [
            'placeholder' => 'София, Берлин, Лондон, Мелник...'
        ]); ?>

    </div>
</form>

<script>
    document.addEventListener('DOMContentLoaded', function () {
        const locationInput = document.querySelector('input[name="location"]');
        if (!locationInput) return;

        const parentWrapper = locationInput.closest('div');
        if (parentWrapper) {
            parentWrapper.classList.add('relative');
        }

        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.className = 'absolute z-50 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl mt-1 max-h-60 overflow-y-auto divide-y divide-slate-100 hidden';
        locationInput.parentNode.insertBefore(suggestionsContainer, locationInput.nextSibling);

        function debounce(func, delay) {
            let timeoutId;
            return function (...args) {
                if (timeoutId) clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                }, delay);
            };
        }

        const searchLocation = async (query) => {
            if (query.length < 3) {
                suggestionsContainer.innerHTML = '';
                suggestionsContainer.classList.add('hidden');
                return;
            }

            suggestionsContainer.innerHTML = '<div class="p-3 text-sm text-slate-400 italic flex items-center gap-2"><i class="fa-solid fa-spinner animate-spin"></i> Търсене...</div>';
            suggestionsContainer.classList.remove('hidden');

            try {
                const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(query)}&accept-language=bg&limit=10`;

                const response = await fetch(url, {
                    headers: { 'Accept': 'application/json' }
                });

                if (!response.ok) throw new Error('API Error');

                const data = await response.json();
                suggestionsContainer.innerHTML = '';

                const uniquePlaces = new Set();

                data.forEach(item => {
                    const addr = item.address;
                    if (!addr) return;

                    const settlement = addr.city || addr.town || addr.village || addr.hamlet || addr.municipality;
                    const country = addr.country;

                    let cleanName = '';

                    if (settlement && country) {
                        if (settlement.toLowerCase() === country.toLowerCase()) {
                            cleanName = country;
                        } else {
                            cleanName = `${settlement}, ${country}`;
                        }
                    } else if (country && item.type === 'country') {
                        cleanName = country;
                    }

                    if (cleanName && !uniquePlaces.has(cleanName)) {
                        uniquePlaces.add(cleanName);

                        const row = document.createElement('button');
                        row.type = 'button';
                        row.className = 'w-full text-left p-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-start gap-2.5';
                        row.innerHTML = `
                        <i class="fa-solid fa-location-dot text-slate-400 mt-0.5 shrink-0"></i>
                        <span class="truncate">${cleanName}</span>
                    `;

                        row.addEventListener('click', function () {
                            locationInput.value = cleanName;
                            suggestionsContainer.innerHTML = '';
                            suggestionsContainer.classList.add('hidden');
                        });

                        suggestionsContainer.appendChild(row);
                    }
                });

                if (uniquePlaces.size === 0) {
                    suggestionsContainer.innerHTML = '<div class="p-3 text-sm text-slate-400 italic">Няма намерени градове или села</div>';
                }

            } catch (error) {
                console.error('Nominatim Error:', error);
                suggestionsContainer.innerHTML = '<div class="p-3 text-sm text-red-500 italic">Грешка при зареждане</div>';
            }
        };

        locationInput.addEventListener('input', debounce((e) => {
            searchLocation(e.target.value.trim());
        }, 400));

        document.addEventListener('click', function (e) {
            if (!locationInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                suggestionsContainer.classList.add('hidden');
            }
        });

        locationInput.addEventListener('focus', function () {
            if (locationInput.value.trim().length >= 3 && suggestionsContainer.children.length > 0) {
                suggestionsContainer.classList.remove('hidden');
            }
        });
    });
</script>
