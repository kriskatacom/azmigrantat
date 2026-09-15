<?php

use App\Core\View;
use App\Modules\Table;

$currentTab = $_GET['tab'] ?? 'all';
$search = $_GET['search'] ?? '';

// 1. Конфигурация на хедъра за Галерии
Table::pageHeader([
    'base_url' => '/admin/galleries',
    'count'    => $galleries->total(),
    'show_create' => ($currentTab !== 'trash'),
    'create_btn' => [
        'url'   => '/admin/galleries/create',
        'label' => 'Създай галерия',
        'icon'  => 'fa-plus'
    ],
    'tabs' => [
        'all' => [
            'label'    => 'Всички галерии',
            'title'    => 'Галерии',
            'subtitle' => 'Активни галерии в сайта: {count}',
            'icon'     => 'fa-images',
            'bg'       => 'bg-primary/10',
            'text'     => 'text-primary'
        ],
        'trash' => [
            'label'    => 'Кошче',
            'title'    => 'Кошче',
            'subtitle' => 'Изтрити галерии: {count} <span class="text-slate-400 text-xs ml-2 italic">(Могат да бъдат възстановени)</span>',
            'icon'     => 'fa-trash-can',
            'bg'       => 'bg-red-50',
            'text'     => 'text-red-500'
        ]
    ]
]);
?>

<?php View::component('flash-messages', 'admin/components'); ?>

<div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <table class="w-full text-left border-collapse">
        <?php
        // Дефинираме заглавията на колоните
        if ($currentTab === 'trash') {
            Table::thead(['payload' => 'Име / Съдържание', 'deleted_at' => 'Изтрита на', 'Действия']);
        } else {
            Table::thead(['payload' => 'Галерия', 'media_count' => 'Снимки', 'created_at' => 'Създадена на', 'Действия']);
        }
        ?>

        <tbody>
            <?php if (count($galleries) > 0): ?>
                <?php foreach ($galleries as $gallery): ?>
                    <tr class="hover:bg-slate-50 transition-colors">
                        <td class="p-4">
                            <div class="flex items-center gap-4">
                                <div class="flex items-center shrink-0">
                                    <?php
                                    $previewMedia = $gallery->media()->limit(3)->get();
                                    $mediaCount = $gallery->media()->count();
                                    ?>

                                    <?php if ($mediaCount > 0): ?>
                                        <div class="flex -space-x-3 overflow-hidden">
                                            <?php foreach ($previewMedia as $media): ?>
                                                <img class="inline-block h-10 w-10 rounded-lg ring-2 ring-white object-cover bg-slate-100"
                                                    src="<?= $media->file_path ?>"
                                                    loading="lazy"
                                                    alt="">
                                            <?php endforeach; ?>

                                            <?php if ($mediaCount > 3): ?>
                                                <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 ring-2 ring-white text-[10px] font-medium text-white">
                                                    +<?= $mediaCount - 3 ?>
                                                </div>
                                            <?php endif; ?>
                                        </div>
                                    <?php else: ?>
                                        <div class="w-10 h-10 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400">
                                            <i class="fa-solid fa-image-slash text-sm"></i>
                                        </div>
                                    <?php endif; ?>
                                </div>

                                <div class="min-w-0">
                                    <div class="font-bold text-slate-900 truncate max-w-xs group-hover:text-primary transition-colors">
                                        <?= htmlspecialchars($gallery->payload ?: 'Без име') ?>
                                    </div>
                                    <div class="flex items-center gap-2 mt-0.5">
                                        <span class="text-[10px] text-slate-400 font-mono tracking-tighter">ID: #<?= $gallery->id ?></span>
                                        <?php if ($gallery->is_active): ?>
                                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Активна"></span>
                                        <?php else: ?>
                                            <span class="w-1.5 h-1.5 rounded-full bg-slate-300" title="Неактивна"></span>
                                        <?php endif; ?>
                                    </div>
                                </div>
                            </div>
                        </td>

                        <?php if ($currentTab !== 'trash'): ?>
                            <td class="p-4">
                                <span class="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full">
                                    <i class="fa-solid fa-camera mr-1"></i>
                                    <?= $gallery->media()->count() ?>
                                </span>
                            </td>
                        <?php endif; ?>

                        <td class="p-4 text-sm text-slate-600">
                            <?= $gallery->{$currentTab === 'trash' ? 'deleted_at' : 'created_at'}->format('d.m.Y H:i') ?>
                        </td>

                        <td class="p-4 text-right">
                            <div class="flex justify-end gap-2">
                                <?php if ($currentTab === 'trash'): ?>
                                    <form action="/admin/galleries/restore/<?= $gallery->id ?>" method="POST">
                                        <button type="submit" class="p-2 text-slate-400 hover:text-emerald-500 transition-colors" title="Възстановяване">
                                            <i class="fa-solid fa-rotate-left"></i>
                                        </button>
                                    </form>

                                    <form action="/admin/galleries/force-delete/<?= $gallery->id ?>" method="POST" onsubmit="return confirm('Внимание! Галерията ще бъде изтрита завинаги. Сигурни ли сте?')">
                                        <button type="submit" class="p-2 text-slate-400 hover:text-red-600 transition-colors" title="Изтрий окончателно">
                                            <i class="fa-solid fa-circle-xmark"></i>
                                        </button>
                                    </form>

                                <?php else: ?>
                                    <a href="/admin/galleries/edit/<?= $gallery->id ?>" class="p-2 text-slate-400 hover:text-primary transition-colors" title="Редактиране">
                                        <i class="fa-solid fa-pen-to-square"></i>
                                    </a>

                                    <form action="/admin/galleries/delete/<?= $gallery->id ?>" method="POST" onsubmit="return confirm('Сигурни ли сте, че искате да преместите галерията в кошчето?')">
                                        <button type="submit" class="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Премести в кошчето">
                                            <i class="fa-solid fa-trash-can"></i>
                                        </button>
                                    </form>
                                <?php endif; ?>
                            </div>
                        </td>
                    </tr>
                <?php endforeach; ?>
            <?php else: ?>
                <?php
                $cols = ($currentTab === 'trash') ? 3 : 4;
                Table::emptyState($cols, 'fa-images');
                ?>
            <?php endif; ?>
        </tbody>
    </table>
</div>

<?php if ($currentTab === 'all') Table::footer($galleries); ?>
