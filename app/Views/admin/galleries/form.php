<?php

use App\Modules\Form;
use App\Core\View;

$isEdit = isset($gallery) && $gallery->exists;
$totalPages = $totalPages ?? 0;
$currentPage = $currentPage ?? 1;
?>

<div class="mb-8">
    <a href="/admin/galleries" class="text-slate-500 hover:text-primary text-sm mb-2 flex items-center gap-2 transition-colors">
        <i class="fa-solid fa-arrow-left"></i> Назад към списъка
    </a>
    <h1 class="text-2xl font-semibold text-slate-900">
        <?= $isEdit ? "Редактиране на галерия" : "Нова галерия" ?>
    </h1>
    <p class="text-sm font-medium text-slate-500">
        <?= $isEdit ? "Управление на съдържанието и изображенията на '{$gallery->payload}'" : "Създаване на нова фото галерия." ?>
    </p>
</div>

<?php View::component('flash-messages', 'admin/components'); ?>

<form action="<?= $isEdit ? "/admin/galleries/update/{$gallery->id}" : "/admin/galleries/store" ?>" method="POST" class="grid 2xl:grid-cols-3 gap-5 mb-5">

    <div class="xl:col-span-2 space-y-5">

        <?php if ($isEdit): ?>
            <?php Form::section('Изображения в галерията', function () use ($media, $gallery, $totalPages, $currentPage) { ?>
                <div class="space-y-6">
                    <div class="flex items-center justify-between">
                        <p class="text-xs text-slate-400 uppercase tracking-wider font-semibold">Медийна библиотека (Изображения)</p>
                        <span class="bg-slate-100 text-slate-500 px-2 py-1 rounded-md font-medium">Кликнете върху снимка, за да я добавите</span>
                    </div>

                    <div id="media-grid-container" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 p-1">
                        <?php
                        $selectedMediaIds = $gallery->media->pluck('id')->toArray();
                        foreach ($media as $item):
                            $isSelected = in_array($item->id, $selectedMediaIds);
                        ?>
                            <label class="relative cursor-pointer group">
                                <input type="checkbox" name="media_ids[]" value="<?= $item->id ?>"
                                    class="peer hidden" <?= $isSelected ? 'checked' : '' ?>>

                                <div class="relative aspect-square rounded-2xl border-4 border-white shadow-sm ring-1 ring-slate-200 overflow-hidden transition-all duration-300 
                                            peer-checked:ring-primary peer-checked:ring-offset-2 peer-checked:shadow-lg peer-checked:scale-[0.98]">

                                    <img src="<?= $item->file_path ?>"
                                        alt="<?= $item->alt_text ?>"
                                        loading="lazy"
                                        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 <?= !$isSelected ? 'grayscale-[0.4] group-hover:grayscale-0' : '' ?>">

                                    <div class="absolute inset-0 bg-primary/20 opacity-0 peer-checked:opacity-100 transition-opacity flex items-center justify-center">
                                        <div class="bg-white text-primary rounded-full w-8 h-8 flex items-center justify-center shadow-xl transform scale-0 peer-checked:scale-100 transition-transform duration-300">
                                            <i class="fa-solid fa-check"></i>
                                        </div>
                                    </div>

                                    <div class="absolute top-2 right-2 bg-primary text-white font-semibold px-2 py-1 rounded-lg opacity-0 peer-checked:opacity-100 transition-opacity">
                                        Избрана
                                    </div>
                                </div>

                                <div class="mt-2 text-slate-500 truncate text-center px-1 font-medium group-hover:text-primary transition-colors">
                                    <?= $item->file_name ?>
                                </div>
                            </label>
                        <?php endforeach; ?>
                    </div>

                    <?php if ($totalPages > 1): ?>
                        <div id="pagination-container" class="mt-5 p-5 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">

                            <div class="text-sm text-slate-500">
                                Страница <span class="font-semibold text-slate-700"><?= $currentPage ?></span> от <span class="font-semibold text-slate-700"><?= $totalPages ?></span>
                            </div>

                            <nav class="flex items-center gap-1">
                                <?php if ($currentPage <= 1): ?>
                                    <span class="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed">
                                        <i class="fa-solid fa-chevron-left text-xs"></i>
                                    </span>
                                <?php else: ?>
                                    <a href="?page=<?= $currentPage - 1 ?>" class="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary transition-all">
                                        <i class="fa-solid fa-chevron-left text-xs"></i>
                                    </a>
                                <?php endif; ?>

                                <?php for ($i = 1; $i <= $totalPages; $i++): ?>
                                    <?php if ($i == $currentPage): ?>
                                        <span class="min-w-10 h-10 px-2 flex items-center justify-center rounded-lg border border-primary bg-primary text-white font-medium shadow-sm text-sm">
                                            <?= $i ?>
                                        </span>
                                    <?php else: ?>
                                        <a href="?page=<?= $i ?>" class="min-w-10 h-10 px-2 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary transition-all shadow-sm text-sm">
                                            <?= $i ?>
                                        </a>
                                    <?php endif; ?>
                                <?php endfor; ?>

                                <?php if ($currentPage >= $totalPages): ?>
                                    <span class="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed">
                                        <i class="fa-solid fa-chevron-right text-xs"></i>
                                    </span>
                                <?php else: ?>
                                    <a href="?page=<?= $currentPage + 1 ?>" class="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary transition-all">
                                        <i class="fa-solid fa-chevron-right text-xs"></i>
                                    </a>
                                <?php endif; ?>
                            </nav>
                        </div>
                    <?php endif; ?>

                    <?php if (count($media) === 0): ?>
                        <div class="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-slate-300">
                                <i class="fa-solid fa-images text-2xl"></i>
                            </div>
                            <p class="text-slate-500 text-sm font-medium">Няма открити изображения в библиотеката.</p>
                            <a href="/admin/media/upload" class="mt-2 inline-block text-primary text-xs font-semibold hover:underline">Качете нови снимки тук</a>
                        </div>
                    <?php endif; ?>
                </div>
            <?php }, 'fa-images'); ?>
        <?php endif; ?>

        <?php Form::section('Основна информация', function () use ($gallery) { ?>
            <div class="grid xl:grid-cols-2 gap-5">
                <?php Form::input('Име на галерията', 'payload', $gallery->payload ?? '', 'text', [
                    'placeholder' => 'Напр. Лятна почивка 2024',
                    'required' => true,
                ]); ?>

                <?php Form::input('Уникален ключ (Slug)', 'slug', $gallery->slug ?? '', 'text', [
                    'placeholder' => 'lyatna-pochivka',
                    'help' => 'Оставете празно за автоматично генериране.'
                ]); ?>
            </div>
            <div class="mt-4">
                <?php Form::textarea('Кратко описание', 'description', $gallery->description ?? '', [
                    'rows' => 2,
                    'placeholder' => 'Опишете накратко съдържанието на галерията...'
                ]); ?>
            </div>
        <?php }, 'fa-circle-info'); ?>

    </div>

    <div class="xl:col-span-1 space-y-6">

        <?php Form::section('Статус и достъп', function () use ($gallery) { ?>
            <div class="space-y-6">
                <div>
                    <?php Form::toggle('Публично видима', 'is_active', (bool)($gallery->is_active ?? true)); ?>
                    <p class=" text-slate-400 mt-2">Ако е изключено, галерията няма да се появява в сайта.</p>
                </div>

                <div class="pt-4 border-t border-slate-100 space-y-3">
                    <div class="flex items-center justify-between text-xs">
                        <span class="text-slate-400">Автор:</span>
                        <span class="text-slate-700 font-medium"><?= $gallery->user->name ?? 'Система' ?></span>
                    </div>
                    <div class="flex items-center justify-between text-xs">
                        <span class="text-slate-400">Последна промяна:</span>
                        <span class="text-slate-700 font-medium"><?= isset($gallery->last_activity) ? date('d.m.y H:i', $gallery->last_activity) : 'н/а' ?></span>
                    </div>
                </div>
            </div>
        <?php }, 'fa-shield-halved'); ?>

        <div class="sticky top-5 space-y-4">
            <?php Form::submit($isEdit ? 'Запази промените' : 'Продължи към снимки', $isEdit ? 'fa-save' : 'fa-arrow-right'); ?>
        </div>
    </div>
</form>

<?php if ($isEdit): ?>
    <?php $sectionTitle = 'В галерията ' . '(' . count($gallery->media) . ')' ?>

    <?php Form::section($sectionTitle, function () use ($gallery) { ?>
        <?php if (count($gallery->media) > 0): ?>
            <form action="/admin/galleries/clear/<?= $gallery->id ?>" method="POST">
                <button type="submit"
                    onclick="return confirm('Сигурни ли сте, че искате да премахнете ВСИЧКИ снимки от тази галерия?')"
                    class="text-red-500 font-semibold hover:text-red-700 hover:underline transition-colors">
                    <i class="fa-solid fa-trash-can mr-1"></i>
                    Премахване на всички
                </button>
            </form>
        <?php endif; ?>

        <?php if (count($gallery->media) > 0): ?>
            <div class="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-5">
                <?php foreach ($gallery->media as $attachedMedia):
                    $id = $attachedMedia->id;
                    $fullPath = $attachedMedia->file_path;
                    $hasImage = !empty($fullPath);
                ?>
                    <div class="relative group/img aspect-square rounded-lg border border-slate-200 shadow-sm bg-slate-100 overflow-hidden">
                        <img src="<?= $fullPath ?>"
                            alt="<?= $attachedMedia->file_name ?>"
                            loading="lazy"
                            class="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110">

                        <div class="absolute inset-0 bg-black/10 opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none"></div>

                        <div id="actions-<?= $id ?>" class="absolute top-2 right-2 flex gap-1.5 translate-y-2.5 opacity-0 group-hover/img:translate-y-0 group-hover/img:opacity-100 transition-all duration-300 z-10 <?= !$hasImage ? 'hidden' : '' ?>">

                            <button type="button"
                                id="zoom-btn-<?= $id ?>"
                                data-src="<?= $fullPath ?>"
                                class="lightbox-trigger w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur-sm text-orange-500 rounded-md shadow-md hover:bg-orange-500 hover:text-white transition-all duration-200"
                                title="Преглед на голям екран">
                                <i class="fa-solid fa-magnifying-glass"></i>
                            </button>

                            <a id="download-btn-<?= $id ?>"
                                href="<?= $fullPath ?>"
                                download
                                class="w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur-sm text-blue-500 rounded-md shadow-md hover:bg-blue-500 hover:text-white transition-all duration-200"
                                title="Сваляне на изображението">
                                <i class="fa-solid fa-download"></i>
                            </a>

                            <button type="submit"
                                form="detach-media-form"
                                formaction="/admin/galleries/detach/<?= $gallery->id ?>/<?= $id ?>"
                                onclick="return confirm('Премахване от галерията?')"
                                class="w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur-sm text-red-500 rounded-md shadow-md hover:bg-red-500 hover:text-white transition-all duration-200"
                                title="Премахване на изображението">
                                <i class="fa-solid fa-times"></i>
                            </button>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>

            <form id="detach-media-form" method="POST" class="hidden"></form>
        <?php else: ?>
            <div class="text-center py-6">
                <i class="fa-solid fa-layer-group text-slate-200 text-3xl mb-2"></i>
                <p class="text-slate-400 font-medium">Все още няма добавени изображения.</p>
            </div>
        <?php endif; ?>

        <div class="p-3 bg-blue-50 border-t border-blue-100">
            <p class="text-blue-600 leading-tight">
                <i class="fa-solid fa-lightbulb mr-1"></i>
                Снимките тук се опресняват след запис на промените.
            </p>
        </div>
    <?php }, 'fa-images'); ?>
<?php endif; ?>

<script>
    document.addEventListener('DOMContentLoaded', function() {
        ScrollManager.restore();
        ScrollManager.bindToForms();
    });
</script>