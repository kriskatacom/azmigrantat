<?php

use App\Modules\Table;
use App\Core\View;

$currentTab = $_GET['tab'] ?? 'all';
$search = $_GET['search'] ?? '';

Table::pageHeader([
    'base_url' => '/admin/business-categories',
    'count'    => $categories->total(),
    'create_btn' => [
        'url' => '/admin/business-categories/create',
        'label' => 'Нова бизнес категория',
        'icon' => 'fa-plus'
    ],
    'tabs' => [
        'all'   => [
            'label' => 'Всички',
            'title' => 'Бизнес категории',
            'subtitle' => 'Общо в списъка: {count}',
            'icon' => 'fa-briefcase',
            'bg' => 'bg-indigo-50',
            'text' => 'text-indigo-600'
        ],
        'trash' => [
            'label' => 'Кошче',
            'title' => 'Изтрити категории',
            'subtitle' => 'Намерени в кошчето: {count}',
            'icon' => 'fa-trash-can',
            'bg' => 'bg-red-50',
            'text' => 'text-red-500'
        ]
    ]
]);

View::component('flash-messages', 'admin/components'); ?>

<?php if (!empty($breadcrumbs)): ?>
    <div class="mb-5 flex items-center flex-wrap gap-2 text-sm">
        <a href="/admin/business-categories" class="flex items-center gap-1 text-slate-500 hover:text-indigo-600 transition-colors">
            <i class="fa-solid fa-house text-xs"></i>
            Корен
        </a>

        <?php foreach ($breadcrumbs as $index => $crumb): ?>
            <span class="text-slate-300">/</span>

            <?php if ($index === count($breadcrumbs) - 1): ?>
                <span class="font-bold text-slate-700"><?= htmlspecialchars($crumb->name) ?></span>
            <?php else: ?>
                <a href="/admin/business-categories?parent_id=<?= $crumb->id ?>" class="text-indigo-600 hover:underline">
                    <?= htmlspecialchars($crumb->name) ?>
                </a>
            <?php endif; ?>
        <?php endforeach; ?>
    </div>
<?php endif; ?>

<div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <table class="w-full text-left border-collapse">
        <?php Table::thead([
            'id'            => '#',
            'name'          => 'Категория',
            'parent_id'     => 'Родител',
            'sub_count'     => 'Подкатегории',
            'companies_count' => 'Фирми',
            'sort_order'    => 'Подредба',
            'Действия'
        ]); ?>

        <tbody class="divide-y divide-slate-100">
            <?php if ($categories && $categories->count() > 0): ?>
                <?php foreach ($categories as $category): ?>
                    <tr class="hover:bg-slate-50 transition-colors">
                        <?php Table::td('<span class="font-mono text-xs text-slate-400">' . $category->id . '</span>'); ?>

                        <?php Table::td('
                            <div class="flex items-center gap-3 group">
                                <div class="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-300 border border-slate-100">
                                    <i class="fa-solid ' . ($category->icon ?? 'fa-tag') . ' text-lg group-hover:text-indigo-600 transition-colors"></i>
                                </div>
                                <div class="truncate">
                                    <a href="/admin/business-categories/edit/' . $category->id . '" class="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors block truncate">
                                        ' . htmlspecialchars($category->name) . '
                                    </a>
                                    <div class="text-[10px] text-slate-400 font-mono italic">/' . $category->slug . '</div>
                                </div>
                            </div>
                        '); ?>

                        <?php Table::td(
                            $category->parent
                                ? '<span class="text-sm text-slate-600"><i class="fa-solid fa-turn-up fa-rotate-90 mr-1 text-slate-300"></i>' . htmlspecialchars($category->parent->name) . '</span>'
                                : '<span class="text-xs text-slate-400 italic">Основна</span>'
                        ); ?>

                        <?php
                        $count = $category->children->count();
                        $btnHtml = '';

                        if ($count > 0) {
                            $btnHtml = '
                                <a href="/admin/business-categories?parent_id=' . $category->id . '" 
                                class="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-700 rounded-lg text-xs font-medium transition-colors">
                                    <i class="fa-solid fa-folder-tree opacity-50"></i>
                                    Виж (' . $count . ')
                                </a>';
                        } else {
                            $btnHtml = '<span class="text-xs text-slate-300 italic">Няма подкатегории</span>';
                        }

                        Table::td($btnHtml);
                        ?>

                        <?php Table::td('
                            <span class="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                ' . ($category->companies()->count() ?? 0) . ' фирми
                            </span>
                        '); ?>

                        <?php Table::td('
                            <div class="flex items-center gap-1.5 text-slate-500">
                                <i class="fa-solid fa-sort text-[10px] opacity-40"></i>
                                <span class="text-xs font-medium">' . $category->sort_order . '</span>
                            </div>
                        '); ?>

                        <?php ob_start(); ?>
                        <div class="flex justify-end gap-1">
                            <?php if ($category->trashed()): ?>
                                <form action="/admin/business-categories/restore/<?= $category->id ?>" method="POST" class="inline">
                                    <button class="p-2 text-slate-400 hover:text-emerald-500 transition-colors" title="Възстанови">
                                        <i class="fa-solid fa-trash-arrow-up text-sm"></i>
                                    </button>
                                </form>
                                <form action="/admin/business-categories/force-delete/<?= $category->id ?>" method="POST" class="inline" onsubmit="return confirm('Изтриване завинаги?')">
                                    <button class="p-2 text-slate-400 hover:text-red-600 transition-colors" title="Изтрий завинаги">
                                        <i class="fa-solid fa-circle-xmark text-sm"></i>
                                    </button>
                                </form>
                            <?php else: ?>
                                <a href="/admin/business-categories/edit/<?= $category->id ?>" class="p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="Редакция">
                                    <i class="fa-solid fa-pen text-sm"></i>
                                </a>
                                <form action="/admin/business-categories/delete/<?= $category->id ?>" method="POST" class="inline" onsubmit="return confirm('Преместване в кошчето?')">
                                    <button class="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Изтрий">
                                        <i class="fa-solid fa-trash text-sm"></i>
                                    </button>
                                </form>
                            <?php endif; ?>
                        </div>
                        <?php Table::td(ob_get_clean(), '', true); ?>
                    </tr>
                <?php endforeach; ?>
            <?php else: ?>
                <?php Table::emptyState(6, 'fa-briefcase'); ?>
            <?php endif; ?>
        </tbody>
    </table>
</div>

<?php Table::footer($categories); ?>
