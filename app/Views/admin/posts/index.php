<?php

use App\Modules\Table;
use App\Core\View;

$currentTab = $_GET['tab'] ?? 'active';
$search = $_GET['search'] ?? '';

$currentParams = $_GET;
$baseQuery = $currentParams;
unset($baseQuery['tab']);

$getLink = function ($tabName) use ($baseQuery) {
    return '/admin/posts?' . http_build_query(array_merge($baseQuery, ['tab' => $tabName]));
};

Table::pageHeader([
    'base_url' => '/admin/posts',
    'count' => $posts->total(),
    'create_btn' => ['url' => '/admin/posts/create', 'label' => 'Нова публикация', 'icon' => 'fa-plus'],
    'tabs' => [
        'all' => [
            'url' => $getLink('all'),
            'label' => 'Всички',
            'title' => 'Всички',
            'subtitle' => 'Общо записи: {count}',
            'icon' => 'fa-list',
            'bg' => 'bg-slate-50',
            'text' => 'text-slate-600'
        ],
        'active' => [
            'url' => $getLink('active'),
            'label' => 'Активни',
            'title' => 'Активни публикации',
            'subtitle' => 'Публикувани: {count}',
            'icon' => 'fa-newspaper',
            'bg' => 'bg-emerald-50',
            'text' => 'text-emerald-600'
        ],
        'inactive' => [
            'url' => $getLink('inactive'),
            'label' => 'Неактивни',
            'title' => 'Неактивни публикации',
            'subtitle' => 'Скрити публикации: {count}',
            'icon' => 'fa-folder',
            'bg' => 'bg-orange-50',
            'text' => 'text-orange-500'
        ],
        'trash' => [
            'url' => $getLink('trash'),
            'label' => 'Изтрити',
            'title' => 'Кошче',
            'subtitle' => 'Изтрити публикации: {count}',
            'icon' => 'fa-trash',
            'bg' => 'bg-red-50',
            'text' => 'text-red-500'
        ],
    ]
]);

View::component('flash-messages', 'admin/components');

$columns = [
    'name' => 'Публикация',
    'location' => 'Локация (Nominatim)',
    'author' => [
        'label' => 'Автор',
        'sortable' => false,
    ],
    'created_at' => 'Дата на създаване',
    'actions' => [
        'label' => 'Действия',
        'sortable' => false,
    ]
];

Table::header();
Table::thead($columns);

$colspan = count($columns);

Table::tbody($posts, $colspan, function ($post) {
    ob_start();
    ?>
    <tr class="hover:bg-slate-50 transition-colors">
        <?php
        $post->options = is_string($post->options) ? json_decode($post->options, true) : ($post->options ?? []);

        ob_start(); ?>
        <div class="flex items-center gap-3">
            <a href="/admin/posts/edit/<?= $post->id ?>" class="flex items-center gap-3 group">
                <?php if (!empty($post->options['main_image'])): ?>
                    <img src="<?= htmlspecialchars($post->options['main_image']) ?>"
                        class="w-14 h-14 rounded-md border border-slate-300 object-cover shrink-0 group-hover:scale-110 transition-transform"
                        alt="Снимка">
                <?php else: ?>
                    <div
                        class="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold shrink-0 group-hover:scale-110 transition-transform">
                        <i class="fa-solid fa-newspaper text-sm"></i>
                    </div>
                <?php endif; ?>

                <div class="truncate max-w-70">
                    <div class="font-medium text-slate-900 truncate group-hover:text-primary transition-colors">
                        <?= htmlspecialchars($post->name) ?>
                    </div>
                    <div class="text-[11px] text-slate-400 font-mono italic">/
                        <?= htmlspecialchars($post->slug) ?>
                    </div>
                </div>
            </a>
        </div>
        <?php Table::td(ob_get_clean()); ?>

        <?php
        $locationHtml = $post->location
            ? '<span class="flex items-center gap-1.5 text-slate-600"><i class="fa-solid fa-location-dot text-slate-400 text-xs"></i> ' . htmlspecialchars($post->location) . '</span>'
            : '<span class="text-slate-400 italic text-xs">Няма посочена локация</span>';
        Table::td($locationHtml, 'text-sm'); ?>

        <?php
        $authorName = $post->user->name ?? 'Изтрит потребител';
        Table::td('<span class="font-medium text-slate-700">' . htmlspecialchars($authorName) . '</span>', 'text-sm'); ?>

        <?php
        $dateText = $post->created_at ? $post->created_at->format('d.m.Y H:i') : '-';
        Table::td('<span class="text-xs text-slate-400 font-mono">' . $dateText . '</span>'); ?>

        <?php
        ob_start(); ?>
        <div class="flex justify-end gap-2">
            <?php if ($post->trashed()): ?>
                <form action="/admin/posts/restore/<?= $post->id ?>" method="POST">
                    <button class="p-2 text-slate-400 hover:text-emerald-500 transition-colors" title="Възстанови публикацията">
                        <i class="fa-solid fa-trash-arrow-up text-sm"></i>
                    </button>
                </form>
                <form action="/admin/posts/force-delete/<?= $post->id ?>" method="POST"
                    onsubmit="return confirm('Наистина ли искате да изтриете тази публикация ЗАВИНАГИ? Действието е необратимо.')">
                    <button class="p-2 text-slate-400 hover:text-red-600 transition-colors" title="Изтрий завинаги">
                        <i class="fa-solid fa-circle-xmark text-sm"></i>
                    </button>
                </form>
            <?php else: ?>
                <a href="/admin/posts/edit/<?= $post->id ?>" class="p-2 text-slate-400 hover:text-primary transition-colors"
                    title="Редактирай">
                    <i class="fa-solid fa-pen text-sm"></i>
                </a>
                <form action="/admin/posts/delete/<?= $post->id ?>" method="POST"
                    onsubmit="return confirm('Сигурни ли сте, че искате да преместите тази публикация в кошчето?')">
                    <button class="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Премести в кошчето">
                        <i class="fa-solid fa-trash text-sm"></i>
                    </button>
                </form>
            <?php endif; ?>
        </div>
        <?php Table::td(ob_get_clean(), '', true); ?>
    </tr>
    <?php
    return ob_get_clean();
}, 'fa-newspaper');

Table::footer($posts);
