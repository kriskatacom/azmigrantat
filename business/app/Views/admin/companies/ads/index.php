<?php

use App\Core\View;
use App\Modules\Table;

$search = $_GET['search'] ?? '';

Table::pageHeader([
    'base_url' => "/admin/companies/{$company->id}/ads",
    'count'    => $ads->total(),
    'show_create' => true,
    'create_btn' => [
        'url'   => "/admin/companies/{$company->id}/ads/create",
        'label' => 'Нова услуга',
        'icon'  => 'fa-plus'
    ],
    'tabs' => [
        'all' => [
            'label'    => 'Всички',
            'title'    => 'Услуги на ' . htmlspecialchars($company->name),
            'subtitle' => 'Всички услуги',
            'count'    => $counts['all'] ?? 0,
            'icon'     => 'fa-rectangle-ad',
            'bg'       => 'bg-blue-100',
            'text'     => 'text-blue-600'
        ],
        'active' => [
            'label'    => 'Активни',
            'title'    => 'Активни обяви',
            'subtitle' => 'Виждат се в публичния профил',
            'count'    => $counts['published'] ?? 0,
            'url'      => "/admin/companies/{$company->id}/ads?tab=active",
            'icon'     => 'fa-check-double',
            'bg'       => 'bg-emerald-100',
            'text'     => 'text-emerald-600'
        ],
        'inactive' => [
            'label'    => 'Неактивни',
            'title'    => 'Спрени обяви',
            'subtitle' => 'Скрити от потребителите',
            'count'    => $counts['draft'] ?? 0,
            'url'      => "/admin/companies/{$company->id}/ads?tab=inactive",
            'icon'     => 'fa-eye-slash',
            'bg'       => 'bg-slate-100',
            'text'     => 'text-slate-600'
        ],
        'trash' => [
            'label'    => 'Кошче',
            'title'    => 'Изтрити обяви',
            'subtitle' => 'Обяви в кошчето',
            'count'    => $counts['trash'] ?? 0,
            'icon'     => 'fa-trash-can',
            'bg'       => 'bg-rose-100',
            'text'     => 'text-rose-600'
        ]
    ]
]);
?>

<?php View::component('flash-messages', 'admin/components'); ?>

<div class="mb-4">
    <a href="/admin/companies/edit/<?= $company->id ?>" class="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-2 transition-colors">
        <i class="fa-solid fa-arrow-left"></i> Обратно към компанията
    </a>
</div>

<div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <table class="w-full text-left border-collapse">

        <?php
        $columns = [
            'image'      => 'Банер',
            'title'      => 'Заглавие на услуга', // Тук е title
            'is_active'  => 'Статус',
            'sort_order' => 'Приоритет',
            'actions'    => 'Действия'
        ];

        Table::thead($columns);
        ?>

        <?php Table::tbody($ads, count($columns), function ($ad) {
            ob_start();
            $options = $ad->options ?? [];
            $desktopImg = $options['image_desktop'] ?? null;

            $statusClass = $ad->is_active
                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                : 'bg-slate-50 text-slate-500 border-slate-200';

            $statusLabel = $ad->is_active ? 'Активна' : 'Неактивна';
        ?>
            <tr class="hover:bg-slate-50 transition-colors">

                <?php Table::td('
                    <div class="w-16 h-10 bg-slate-50 rounded border border-slate-100 overflow-hidden flex items-center justify-center">
                        ' . ($desktopImg
                    ? '<img src="' . $desktopImg . '" class="w-full h-full object-cover">'
                    : '<i class="fa-solid fa-rectangle-ad text-slate-200 text-xs"></i>') . '
                    </div>
                '); ?>

                <?php Table::td('
                    <div>
                        <div class="font-medium text-slate-900">' . htmlspecialchars($ad->title) . '</div>
                        <div class="text-[10px] text-slate-400 uppercase tracking-wider">ID: #' . $ad->id . '</div>
                    </div>
                '); ?>

                <?php Table::td('
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ' . $statusClass . '">
                        ' . $statusLabel . '
                    </span>
                '); ?>

                <?php Table::td('
                    <div class="text-sm font-semibold text-slate-600">
                         ' . $ad->sort_order . '
                    </div>
                '); ?>

                <td class="p-4 text-right">
                    <div class="flex justify-end gap-2">
                        <?php if (!$ad->deleted_at): ?>
                            <form action="/admin/ads/toggle-status/<?= $ad->id ?>?tab=<?= $_GET['tab'] ?? 'all' ?>" method="POST" class="inline">
                                <?php if ($ad->is_active): ?>
                                    <button type="submit" class="p-2 text-emerald-500 hover:text-amber-500 transition-colors" title="Деактивирай">
                                        <i class="fa-solid fa-toggle-on fa-lg"></i>
                                    </button>
                                <?php else: ?>
                                    <button type="submit" class="p-2 text-slate-300 hover:text-emerald-500 transition-colors" title="Активирай">
                                        <i class="fa-solid fa-toggle-off fa-lg"></i>
                                    </button>
                                <?php endif; ?>
                            </form>

                            <a href="/admin/ads/edit/<?= $ad->id ?>"
                                class="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                                title="Редактиране">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </a>
                        <?php endif; ?>

                        <?php if ($ad->deleted_at): ?>
                            <form action="/admin/ads/restore/<?= $ad->id ?>?tab=trash" method="POST" class="inline">
                                <button type="submit" class="p-2 text-slate-400 hover:text-emerald-500 transition-colors" title="Възстановяване">
                                    <i class="fa-solid fa-trash-arrow-up"></i>
                                </button>
                            </form>
                        <?php endif; ?>

                        <form action="/admin/ads/<?= $ad->deleted_at ? 'force-delete' : 'delete' ?>/<?= $ad->id ?>?tab=<?= $_GET['tab'] ?? 'all' ?>"
                            method="POST"
                            onsubmit="return confirm('<?= $ad->deleted_at ? 'Изтриване завинаги?' : 'Преместване в кошчето?' ?>')"
                            class="inline">
                            <button type="submit"
                                class="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                title="Изтриване">
                                <i class="fa-solid <?= $ad->deleted_at ? 'fa-circle-xmark' : 'fa-trash-can' ?>"></i>
                            </button>
                        </form>
                    </div>
                </td>
            </tr>
        <?php return ob_get_clean();
        }, 'fa-rectangle-ad'); ?>

    </table>
</div>

<?php Table::footer($ads); ?>