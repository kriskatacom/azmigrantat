<?php

use App\Core\View;
use App\Modules\Table;
use App\Helpers\GlobalHelpers;

$currentTab = $_GET['tab'] ?? 'all';
$search = $_GET['search'] ?? '';

// 1. Използваме универсалния хедър
Table::pageHeader([
    'base_url' => '/admin/media',
    'count'    => $media->total(),
    'show_create' => ($currentTab !== 'trash'),
    'create_btn' => [
        'url'   => '/admin/media/upload',
        'label' => 'Добави нов файл',
        'icon'  => 'fa-plus'
    ],
    'tabs' => [
        'all' => [
            'label'    => 'Всички файлове',
            'title'    => 'Медия Библиотека',
            'subtitle' => 'Активни активи в библиотеката: {count}',
            'icon'     => 'fa-photo-film',
            'bg'       => 'bg-primary/10',
            'text'     => 'text-primary'
        ],
        'trash' => [
            'label'    => 'Кошче',
            'title'    => 'Кошче',
            'subtitle' => 'Изтрити файлове: {count} <span class="text-slate-400 text-xs ml-2 italic">(Файловете могат да бъдат възстановени)</span>',
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
        <?php if ($currentTab === 'trash') {
            Table::thead(['file_name' => 'Файл', 'deleted_at' => 'Изтрит на', 'Действия']);
        } else {
            Table::thead(['file_name' => 'Файл', 'file_type' => 'Тип', 'file_size' => 'Размер', 'created_at' => 'Качен на', 'Действия']);
        } ?>

        <tbody>
            <?php if (count($media) > 0): ?>
                <?php foreach ($media as $item): ?>
                    <tr class="hover:bg-slate-50 transition-colors">
                        <td class="p-4">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 rounded-lg border border-slate-100 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
                                    <?php if (str_contains($item->file_type, 'image')): ?>
                                        <img src="<?= $item->file_path ?>" alt="<?= $item->alt_text ?>" loading="lazy" class="w-full h-full object-cover">
                                    <?php else: ?>
                                        <i class="fa-solid <?= GlobalHelpers::getFileIcon($item->file_type) ?> text-slate-400 text-xl"></i>
                                    <?php endif; ?>
                                </div>
                                <div>
                                    <div class="font-medium text-slate-900 truncate max-w-64" title="<?= $item->file_name ?>">
                                        <?= $item->file_name ?>
                                    </div>
                                    <div class="text-xs text-slate-500 italic"><?= $item->alt_text ?: 'Няма описание' ?></div>
                                </div>
                            </div>
                        </td>

                        <?php if ($currentTab !== 'trash'): ?>
                            <td class="p-4">
                                <span class="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded uppercase tracking-wider">
                                    <?= explode('/', $item->file_type)[1] ?? 'file' ?>
                                </span>
                            </td>
                            <td class="p-4 text-sm text-slate-600">
                                <?= GlobalHelpers::getFormattedSizeAttribute($item->file_size) ?>
                            </td>
                        <?php endif; ?>

                        <td class="p-4 text-sm text-slate-600">
                            <?= $item->created_at->format('d.m.Y H:i') ?>
                        </td>

                        <td class="p-4 text-right">
                            <div class="flex justify-end gap-2">
                                <?php if ($currentTab === 'trash'): ?>
                                    <form action="/admin/media/restore/<?= $item->id ?>" method="POST">
                                        <button type="submit" class="p-2 text-slate-400 hover:text-emerald-500 transition-colors" title="Възстановяване">
                                            <i class="fa-solid fa-rotate-left"></i>
                                        </button>
                                    </form>

                                    <form action="/admin/media/force-delete/<?= $item->id ?>" method="POST" onsubmit="return confirm('Внимание! Този файл ще бъде изтрит завинаги. Сигурни ли сте?')">
                                        <button type="submit" class="p-2 text-slate-400 hover:text-red-600 transition-colors" title="Изтрий окончателно">
                                            <i class="fa-solid fa-circle-xmark"></i>
                                        </button>
                                    </form>

                                <?php else: ?>
                                    <a href="<?= $item->file_path ?>" target="_blank" class="p-2 text-slate-400 hover:text-primary transition-colors" title="Виж файла">
                                        <i class="fa-solid fa-external-link"></i>
                                    </a>

                                    <form action="/admin/media/delete/<?= $item->id ?>" method="POST" onsubmit="return confirm('Сигурни ли сте, че искате да преместите файла в кошчето?')">
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
                <?php $cols = ($currentTab === 'trash') ? 3 : 5;
                Table::emptyState($cols, 'fa-photo-film'); ?>
            <?php endif; ?>
        </tbody>
    </table>
</div>

<?php if ($currentTab === 'all') Table::footer($media); ?>