<?php

use App\Modules\Table;
use App\Core\View;

$currentTab = $_GET['tab'] ?? 'all';
$search = $_GET['search'] ?? '';

function renderPageRows($pages, $level = 0, $search = '')
{
    foreach ($pages as $page): ?>
        <tr class="hover:bg-slate-50 transition-colors">
            <?php
            Table::td('
                <div class="flex items-center" style="padding-left: ' . ($level * 24) . 'px;">
                    ' . ($level > 0 ? '<i class="fa-solid fa-turn-up rotate-90 text-slate-300 mr-3 text-[10px]"></i>' : '') . '
                    
                    <a href="/admin/pages/edit/' . $page->id . '" class="flex items-center gap-3 group">
                        <div class="w-10 h-10 ' . ($page->is_active ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400') . ' rounded-xl flex items-center justify-center font-bold shrink-0 group-hover:scale-110 transition-transform">
                            <i class="fa-solid ' . ($page->template === 'home' ? 'fa-house-chimney' : 'fa-file-lines') . ' text-sm"></i>
                        </div>
                        <div class="truncate">
                            <div class="font-medium text-slate-900 truncate group-hover:text-primary transition-colors">' . htmlspecialchars($page->title) . '</div>
                            <div class="text-[11px] text-slate-400 font-mono italic">/' . ltrim($page->slug, '/') . '</div>
                        </div>
                    </a>
                </div>
            '); ?>

            <?php Table::td('<span class="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider">' . ($page->template ?: 'default') . '</span>'); ?>

            <?php $statusHtml = $page->is_active
                ? '<span class="flex items-center gap-1.5 text-emerald-600 font-medium"><span class="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Видима</span>'
                : '<span class="flex items-center gap-1.5 text-orange-500 font-medium"><span class="w-1.5 h-1.5 bg-orange-400 rounded-full"></span> Скрита</span>';
            Table::td($statusHtml, 'text-sm'); ?>

            <?php ob_start(); ?>
            <div class="flex justify-end gap-2">
                <?php if ($page->trashed()): ?>
                    <form action="/admin/pages/restore/<?= $page->id ?>" method="POST">
                        <button class="p-2 text-slate-400 hover:text-emerald-500 transition-colors" title="Възстанови"><i class="fa-solid fa-trash-arrow-up text-sm"></i></button>
                    </form>
                    <form action="/admin/pages/force-delete/<?= $page->id ?>" method="POST" onsubmit="return confirm('Изтриване завинаги?')">
                        <button class="p-2 text-slate-400 hover:text-red-600 transition-colors"><i class="fa-solid fa-circle-xmark text-sm"></i></button>
                    </form>
                <?php else: ?>                    
                    <a href="/admin/pages/elements/<?= $page->id ?>" class="p-2 text-slate-400 hover:text-primary transition-colors">
                        <i class="fa-solid fa-cubes"></i>
                    </a>
                    <a href="/admin/pages/edit/<?= $page->id ?>" class="p-2 text-slate-400 hover:text-primary transition-colors">
                        <i class="fa-solid fa-pen text-sm"></i>
                    </a>
                    <form action="/admin/pages/delete/<?= $page->id ?>" method="POST" onsubmit="return confirm('Към кошчето?')">
                        <button class="p-2 text-slate-400 hover:text-red-500 transition-colors"><i class="fa-solid fa-trash text-sm"></i></button>
                    </form>
                <?php endif; ?>
            </div>
            <?php Table::td(ob_get_clean(), '', true); ?>
        </tr>
<?php
        if (empty($search) && !empty($page->children)) {
            renderPageRows($page->children, $level + 1, $search);
        }
    endforeach;
}

Table::pageHeader([
    'base_url' => '/admin/pages',
    'count'    => $pages->total(),
    'create_btn' => ['url' => '/admin/pages/create', 'label' => 'Нова страница', 'icon' => 'fa-plus'],
    'tabs' => [
        'all'      => ['label' => 'Всички', 'title' => 'Всички страници', 'subtitle' => 'Намерени общо: {count}', 'icon' => 'fa-file-lines', 'bg' => 'bg-primary/10', 'text' => 'text-primary'],
        'active'   => ['label' => 'Активни', 'title' => 'Активни страници', 'subtitle' => 'Публикувани: {count}', 'icon' => 'fa-file-circle-check', 'bg' => 'bg-emerald-50', 'text' => 'text-emerald-600'],
        'inactive' => ['label' => 'Неактивни', 'title' => 'Неактивни страници', 'subtitle' => 'Скрити: {count}', 'icon' => 'fa-file-circle-minus', 'bg' => 'bg-orange-50', 'text' => 'text-orange-500'],
        'trash'    => ['label' => 'Кошче', 'title' => 'Кошче', 'subtitle' => 'В кошчето: {count}', 'icon' => 'fa-trash-can', 'bg' => 'bg-red-50', 'text' => 'text-red-500']
    ]
]);

View::component('flash-messages', 'admin/components'); ?>

<div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <table class="w-full text-left border-collapse">
        <?php Table::thead([
            'title'     => 'Страница',
            'template'  => 'Шаблон',
            'is_active' => 'Статус',
            'Действия'
        ]); ?>

        <tbody class="divide-y divide-slate-100">
            <?php if ($pages && $pages->count() > 0): ?>
                <?php renderPageRows($pages, 0, $search); ?>
            <?php else: ?>
                <?php Table::emptyState(4, 'fa-file-circle-xmark'); ?>
            <?php endif; ?>
        </tbody>
    </table>
</div>

<?php Table::footer($pages); ?>