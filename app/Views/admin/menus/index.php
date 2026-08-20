<?php

use App\Core\View;
use App\Modules\Str;
use App\Modules\Table;

$currentTab = $_GET['tab'] ?? 'all';
$search = $_GET['search'] ?? '';

Table::pageHeader([
    'base_url' => '/admin/menus',
    'count'    => $menus->total(),
    'show_create' => true,
    'create_btn' => [
        'url'   => '/admin/menus/create',
        'label' => 'Ново меню',
        'icon'  => 'fa-plus'
    ],
    'tabs' => [
        'all'   => ['label' => 'Всички', 'title' => 'Активни менюта', 'subtitle' => 'Общо дефинирани: {count}', 'icon' => 'fa-list-ul', 'bg' => 'bg-primary/10', 'text' => 'text-primary'],
        'trash' => ['label' => 'Кошче', 'title' => 'Изтрити менюта', 'subtitle' => 'В кошчето: {count}', 'icon' => 'fa-trash-can', 'bg' => 'bg-slate-100', 'text' => 'text-slate-500'],
    ]
]);
?>

<?php View::component('flash-messages', 'admin/components'); ?>

<div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <table class="w-full text-left border-collapse">

        <?php Table::thead([
            'title'       => 'Име на меню',
            'slug'        => 'Слъг (ID)',
            'description' => 'Описание',
            'created_at'  => ($currentTab === 'trash' ? 'Изтрито на' : 'Дата'),
            'Действия'
        ]); ?>

        <?php Table::tbody($menus, 5, function ($menu) use ($currentTab) {
            ob_start();
        ?>
            <tr class="hover:bg-slate-50 transition-colors">
                <?php Table::td('
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-primary/5 text-primary rounded-xl flex items-center justify-center text-lg shrink-0">
                            <i class="fa-solid fa-rectangle-list"></i>
                        </div>
                        <div>
                            <div class="font-semibold text-slate-900">' . htmlspecialchars($menu->title) . '</div>
                            <div class="text-xs text-slate-400">ID: #' . $menu->id . '</div>
                        </div>
                    </div>
                '); ?>

                <?php Table::td('
                    <code class="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-mono">
                        ' . htmlspecialchars($menu->slug) . '
                    </code>
                '); ?>

                <?php Table::td('
                    <div class="text-slate-500 text-sm max-w-xs truncate" title="' . htmlspecialchars($menu->description) . '">
                        ' . ($menu->description ?: '<span class="italic text-slate-300">Няма описание</span>') . '
                    </div>
                '); ?>

                <?php
                $dateValue = $currentTab === 'trash' ? $menu->deleted_at : $menu->created_at;
                Table::td('
                    <div class="text-slate-600 text-sm">
                        ' . date('d.m.Y', strtotime($dateValue)) . '
                        <div class="text-[10px] text-slate-400">' . date('H:i', strtotime($dateValue)) . ' ч.</div>
                    </div>
                '); ?>

                <?php
                $actions = '<div class="flex justify-end gap-1">';

                if ($currentTab === 'trash') {
                    $actions .= '
                        <form action="/admin/menus/restore/' . $menu->id . '" method="POST" class="inline">
                            <button type="submit" class="p-2 text-slate-400 hover:text-emerald-600 transition-colors" title="Възстанови">
                                <i class="fa-solid fa-trash-arrow-up"></i>
                            </button>
                        </form>
                        <form action="/admin/menus/force-delete/' . $menu->id . '" method="POST" onsubmit="return confirm(\'Внимание! Изтриване завинаги?\')" class="inline">
                            <button type="submit" class="p-2 text-slate-400 hover:text-red-600 transition-colors" title="Изтрий окончателно">
                                <i class="fa-solid fa-circle-xmark"></i>
                            </button>
                        </form>';
                } else {
                    $actions .= '
                        <a href="/admin/menus/structure/' . $menu->id . '" class="p-2 text-slate-400 hover:text-emerald-600 transition-colors" title="Структура">
                            <i class="fa-solid fa-sitemap"></i>
                        </a>
                        <a href="/admin/menus/edit/' . $menu->id . '" class="p-2 text-slate-400 hover:text-primary transition-colors" title="Редакция">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </a>
                        <form action="/admin/menus/delete/' . $menu->id . '" method="POST" onsubmit="return confirm(\'Преместване в кошчето?\')" class="inline">
                            <button type="submit" class="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Изтрий">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </form>';
                }

                $actions .= '</div>';
                Table::td($actions, '', true);
                ?>
            </tr>
        <?php
            return ob_get_clean();
        }, ($currentTab === 'trash' ? 'fa-trash-can' : 'fa-folder-open')); ?>

    </table>
</div>

<?php Table::footer($menus); ?>