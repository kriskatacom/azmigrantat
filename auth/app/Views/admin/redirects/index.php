<?php

use App\Modules\Table;
use App\Core\View;

$currentTab = $_GET['tab'] ?? 'all';
$search = $_GET['search'] ?? '';

Table::pageHeader([
    'base_url' => '/admin/redirects',
    'count'    => $redirects->total(),
    'create_btn' => ['url' => '/admin/redirects/create', 'label' => 'Нов редирект', 'icon' => 'fa-plus'],
    'tabs' => [
        'all'      => ['label' => 'Всички', 'title' => 'Пренасочвания', 'subtitle' => 'Общо записи: {count}', 'icon' => 'fa-route', 'bg' => 'bg-primary/10', 'text' => 'text-primary'],
        'active'   => ['label' => 'Активни', 'title' => 'Активни редиректи', 'subtitle' => 'Работещи: {count}', 'icon' => 'fa-circle-check', 'bg' => 'bg-emerald-50', 'text' => 'text-emerald-600'],
        'trash'    => ['label' => 'Кошче', 'title' => 'Кошче', 'subtitle' => 'Изтрити: {count}', 'icon' => 'fa-trash-can', 'bg' => 'bg-red-50', 'text' => 'text-red-500']
    ]
]);

View::component('flash-messages', 'admin/components'); ?>

<div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <table class="w-full text-left border-collapse">
        <?php Table::thead([
            'path'        => 'Маршрут (От -> До)',
            'status_code' => 'Тип',
            'hits_count'  => 'Посещения',
            'is_active'   => 'Статус',
            'Действия'
        ]); ?>

        <tbody class="divide-y divide-slate-100">
            <?php if ($redirects && $redirects->count() > 0): ?>
                <?php foreach ($redirects as $item): ?>
                    <tr class="hover:bg-slate-50 transition-colors">
                        <?php
                        // Колона: Път
                        Table::td('
                            <div class="flex items-center gap-3 group">
                                <div class="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                                    <i class="fa-solid fa-arrow-right-arrow-left text-xs"></i>
                                </div>
                                <div class="truncate">
                                    <div class="flex items-center gap-2">
                                        <span class="font-mono text-[11px] text-slate-400">ОТ:</span>
                                        <span class="font-medium text-slate-900 truncate">' . htmlspecialchars($item->old_path) . '</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <span class="font-mono text-[11px] text-slate-400">ДО:</span>
                                        <span class="text-[12px] text-primary truncate italic">' . htmlspecialchars($item->new_path) . '</span>
                                    </div>
                                </div>
                            </div>
                        ');

                        // Колона: Статус код (301/302)
                        $codeColor = $item->status_code == 301 ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-purple-50 text-purple-600 border-purple-100';
                        Table::td('<span class="px-2 py-0.5 border ' . $codeColor . ' rounded text-[10px] font-bold">' . $item->status_code . '</span>');

                        // Колона: Hits (Статистика)
                        Table::td('
                            <div class="flex flex-col">
                                <span class="font-bold text-slate-700">' . number_format($item->hits_count) . '</span>
                                <span class="text-[10px] text-slate-400">' . ($item->last_used_at ? $item->last_used_at->diffForHumans() : 'не е ползван') . '</span>
                            </div>
                        ');

                        // Колона: Статус (Активен/Неактивен)
                        $statusHtml = $item->is_active
                            ? '<span class="flex items-center gap-1.5 text-emerald-600 font-medium text-sm"><span class="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Активен</span>'
                            : '<span class="flex items-center gap-1.5 text-slate-400 font-medium text-sm"><span class="w-1.5 h-1.5 bg-slate-300 rounded-full"></span> Спрян</span>';
                        Table::td($statusHtml);

                        // Колона: Действия
                        ob_start(); ?>
                        <div class="flex justify-end gap-2">
                            <?php if ($item->trashed()): ?>
                                <form action="/admin/redirects/restore/<?= $item->id ?>" method="POST">
                                    <button class="p-2 text-slate-400 hover:text-emerald-500 transition-colors" title="Възстанови"><i class="fa-solid fa-trash-arrow-up text-sm"></i></button>
                                </form>
                                <form action="/admin/redirects/force-delete/<?= $item->id ?>" method="POST" onsubmit="return confirm('Изтриване завинаги?')">
                                    <button class="p-2 text-slate-400 hover:text-red-600 transition-colors"><i class="fa-solid fa-circle-xmark text-sm"></i></button>
                                </form>
                            <?php else: ?>
                                <a href="/admin/redirects/edit/<?= $item->id ?>" class="p-2 text-slate-400 hover:text-primary transition-colors">
                                    <i class="fa-solid fa-pen text-sm"></i>
                                </a>
                                <form action="/admin/redirects/delete/<?= $item->id ?>" method="POST" onsubmit="return confirm('Към кошчето?')">
                                    <button class="p-2 text-slate-400 hover:text-red-500 transition-colors"><i class="fa-solid fa-trash text-sm"></i></button>
                                </form>
                            <?php endif; ?>
                        </div>
                        <?php Table::td(ob_get_clean(), '', true); ?>
                    </tr>
                <?php endforeach; ?>
            <?php else: ?>
                <?php Table::emptyState(5, 'fa-route'); ?>
            <?php endif; ?>
        </tbody>
    </table>
</div>

<?php Table::footer($redirects); ?>
