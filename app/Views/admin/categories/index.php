<?php

use App\Modules\Table;
use App\Core\View;

$currentTab = $_GET['tab'] ?? 'all';
$search = $_GET['search'] ?? '';

Table::pageHeader([
    'base_url' => '/admin/categories',
    'count'    => $categories->total(),
    'create_btn' => ['url' => '/admin/categories/create', 'label' => 'Нова категория', 'icon' => 'fa-plus'],
    'tabs' => [
        'all'   => ['label' => 'Всички', 'title' => 'Всички категории', 'subtitle' => 'Общо: {count}', 'icon' => 'fa-folder-tree', 'bg' => 'bg-primary/10', 'text' => 'text-primary'],
        'trash' => ['label' => 'Кошче', 'title' => 'Кошче', 'subtitle' => 'Изтрити: {count}', 'icon' => 'fa-trash-can', 'bg' => 'bg-red-50', 'text' => 'text-red-500']
    ]
]);

View::component('flash-messages', 'admin/components'); ?>

<div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <table class="w-full text-left border-collapse">
        <?php Table::thead([
            'id'       => '#',
            'name'     => 'Категория',
            'articles' => 'Статии',
            'order'    => 'Подредба',
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
                                    <i class="fa-solid fa-folder-open text-lg group-hover:text-primary transition-colors"></i>
                                </div>
                                <div class="truncate">
                                    <a href="/admin/categories/edit/' . $category->id . '" class="font-medium text-slate-900 group-hover:text-primary transition-colors block truncate">' . htmlspecialchars($category->name) . '</a>
                                    <div class="text-[10px] text-slate-400 font-mono italic">/' . $category->slug . '</div>
                                </div>
                            </div>
                        '); ?>

                        <?php Table::td('
                            <span class="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                ' . $category->articles()->count() . ' статии
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
                                <form action="/admin/categories/restore/<?= $category->id ?>" method="POST">
                                    <button class="p-2 text-slate-400 hover:text-emerald-500 transition-colors" title="Възстанови"><i class="fa-solid fa-trash-arrow-up text-sm"></i></button>
                                </form>
                                <form action="/admin/categories/force-delete/<?= $category->id ?>" method="POST" onsubmit="return confirm('Изтриване завинаги?')">
                                    <button class="p-2 text-slate-400 hover:text-red-600 transition-colors"><i class="fa-solid fa-circle-xmark text-sm"></i></button>
                                </form>
                            <?php else: ?>
                                <a href="/admin/categories/edit/<?= $category->id ?>" class="p-2 text-slate-400 hover:text-primary transition-colors">
                                    <i class="fa-solid fa-pen text-sm"></i>
                                </a>
                                <form action="/admin/categories/delete/<?= $category->id ?>" method="POST" onsubmit="return confirm('Преместване в кошчето?')">
                                    <button class="p-2 text-slate-400 hover:text-red-500 transition-colors"><i class="fa-solid fa-trash text-sm"></i></button>
                                </form>
                            <?php endif; ?>
                        </div>
                        <?php Table::td(ob_get_clean(), '', true); ?>
                    </tr>
                <?php endforeach; ?>
            <?php else: ?>
                <?php Table::emptyState(5, 'fa-folder-tree'); ?>
            <?php endif; ?>
        </tbody>
    </table>
</div>

<?php Table::footer($categories); ?>