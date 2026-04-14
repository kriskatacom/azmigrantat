<?php

use App\Modules\Table;
use App\Core\View;
use App\Models\Article;

$currentTab = $_GET['tab'] ?? 'all';
$search = $_GET['search'] ?? '';

Table::pageHeader([
    'base_url' => '/admin/articles',
    'count'    => $articles->total(),
    'create_btn' => ['url' => '/admin/articles/create', 'label' => 'Нова статия', 'icon' => 'fa-plus'],
    'tabs' => [
        'all'       => ['label' => 'Всички', 'title' => 'Всички статии', 'subtitle' => 'Намерени общо: {count}', 'icon' => 'fa-newspaper', 'bg' => 'bg-primary/10', 'text' => 'text-primary'],
        'published' => ['label' => 'Публикувани', 'title' => 'Публикувани', 'subtitle' => 'Онлайн: {count}', 'icon' => 'fa-circle-check', 'bg' => 'bg-emerald-50', 'text' => 'text-emerald-600'],
        'draft'     => ['label' => 'Чернови', 'title' => 'Чернови', 'subtitle' => 'В процес: {count}', 'icon' => 'fa-pen-ruler', 'bg' => 'bg-slate-50', 'text' => 'text-slate-500'],
        'trash'     => ['label' => 'Кошче', 'title' => 'Кошче', 'subtitle' => 'Изтрити: {count}', 'icon' => 'fa-trash-can', 'bg' => 'bg-red-50', 'text' => 'text-red-500']
    ]
]);

View::component('flash-messages', 'admin/components'); ?>

<div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <table class="w-full text-left border-collapse">
        <?php Table::thead([
            'title'    => 'Статия',
            'category' => 'Категория',
            'status'   => 'Статус',
            'date'     => 'Дата',
            'Действия'
        ]); ?>

        <tbody class="divide-y divide-slate-100">
            <?php if ($articles && $articles->count() > 0): ?>
                <?php foreach ($articles as $article): ?>
                    <tr class="hover:bg-slate-50 transition-colors">
                        <?php Table::td('
                            <div class="flex items-center gap-3 group">
                                <div class="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                                    ' . ($article->image
                            ? '<img src="' . $article->image . '" class="w-full h-full object-cover group-hover:scale-110 transition-transform">'
                            : '<div class="w-full h-full flex items-center justify-center text-slate-300"><i class="fa-solid fa-image text-lg"></i></div>') . '
                                </div>
                                <div class="truncate">
                                    <a href="/admin/articles/edit/' . $article->id . '" class="font-medium text-slate-900 group-hover:text-primary transition-colors block truncate">' . htmlspecialchars($article->title) . '</a>
                                    <div class="flex gap-1 mt-1">
                                        ' . implode('', array_map(fn($tag) => '<span class="text-[9px] px-1.5 py-0.5 rounded-full border border-slate-200 text-slate-400 bg-slate-50">#' . $tag->name . '</span>', $article->tags->take(3)->all())) . '
                                    </div>
                                </div>
                            </div>
                        '); ?>

                        <?php Table::td('
                            <span class="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-[11px] font-bold uppercase tracking-tight italic">
                                <i class="fa-solid fa-folder-open mr-1 opacity-50"></i>' . ($article->category->name ?? 'Няма') . '
                            </span>
                        '); ?>

                        <?php
                        $statusHtml = match ($article->status) {
                            Article::STATUS_PUBLISHED => '<span class="inline-flex items-center gap-1.5 text-emerald-600 font-semibold text-xs"><span class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Публикувана</span>',
                            Article::STATUS_DRAFT     => '<span class="inline-flex items-center gap-1.5 text-slate-400 font-semibold text-xs"><span class="w-2 h-2 bg-slate-300 rounded-full"></span> Чернова</span>',
                            Article::STATUS_SCHEDULED => '<span class="inline-flex items-center gap-1.5 text-amber-500 font-semibold text-xs"><span class="w-2 h-2 bg-amber-400 rounded-full"></span> Планирана</span>',
                            default                   => $article->status
                        };
                        Table::td($statusHtml);
                        ?>

                        <?php Table::td('
                            <div class="text-xs text-slate-500">
                                <div class="font-medium text-slate-700">' . ($article->published_at ? $article->published_at->format('d.m.Y') : '-') . '</div>
                                <div class="text-[10px] opacity-60">' . ($article->published_at ? $article->published_at->format('H:i') : '') . '</div>
                            </div>
                        '); ?>

                        <?php ob_start(); ?>
                        <div class="flex justify-end gap-1">
                            <?php if ($article->trashed()): ?>
                                <form action="/admin/articles/restore/<?= $article->id ?>" method="POST">
                                    <button class="p-2 text-slate-400 hover:text-emerald-500 transition-colors" title="Възстанови"><i class="fa-solid fa-trash-arrow-up text-sm"></i></button>
                                </form>
                                <form action="/admin/articles/force-delete/<?= $article->id ?>" method="POST" onsubmit="return confirm('Изтриване завинаги?')">
                                    <button class="p-2 text-slate-400 hover:text-red-600 transition-colors"><i class="fa-solid fa-circle-xmark text-sm"></i></button>
                                </form>
                            <?php else: ?>
                                <a href="/admin/articles/edit/<?= $article->id ?>" class="p-2 text-slate-400 hover:text-primary transition-colors">
                                    <i class="fa-solid fa-pen text-sm"></i>
                                </a>
                                <form action="/admin/articles/delete/<?= $article->id ?>" method="POST" onsubmit="return confirm('Преместване в кошчето?')">
                                    <button class="p-2 text-slate-400 hover:text-red-500 transition-colors"><i class="fa-solid fa-trash text-sm"></i></button>
                                </form>
                            <?php endif; ?>
                        </div>
                        <?php Table::td(ob_get_clean(), '', true); ?>
                    </tr>
                <?php endforeach; ?>
            <?php else: ?>
                <?php Table::emptyState(5, 'fa-newspaper'); ?>
            <?php endif; ?>
        </tbody>
    </table>
</div>

<?php Table::footer($articles); ?>
