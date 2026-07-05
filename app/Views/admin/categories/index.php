<?php

use App\Core\View;
use App\Modules\Str;
use App\Modules\Table;

$currentTab = $_GET['tab'] ?? 'active';

$currentParams = $_GET;
$baseQuery = $currentParams;
unset($baseQuery['tab']);

$getLink = function ($tabName) use ($baseQuery) {
    return '/admin/categories?' . http_build_query(array_merge($baseQuery, ['tab' => $tabName]));
};

Table::pageHeader([
    'base_url' => '/admin/categories',
    'count' => $categories->total(),
    'show_create' => true,
    'create_btn' => [
        'url' => '/admin/categories/create',
        'label' => 'Нова категория',
        'icon' => 'fa-plus'
    ],
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
            'title' => 'Активни категории',
            'subtitle' => 'Видими категории: {count}',
            'icon' => 'fa-folder-open',
            'bg' => 'bg-emerald-50',
            'text' => 'text-emerald-600'
        ],
        'inactive' => [
            'url' => $getLink('inactive'),
            'label' => 'Неактивни',
            'title' => 'Неактивни категории',
            'subtitle' => 'Скрити категории: {count}',
            'icon' => 'fa-folder',
            'bg' => 'bg-orange-50',
            'text' => 'text-orange-500'
        ],
        'deleted' => [
            'url' => $getLink('deleted'),
            'label' => 'Изтрити',
            'title' => 'Кошче',
            'subtitle' => 'Изтрити категории: {count}',
            'icon' => 'fa-trash',
            'bg' => 'bg-red-50',
            'text' => 'text-red-500'
        ],
    ]
]);

View::component('flash-messages', 'admin/components'); ?>

<nav class="mb-4 flex items-center text-sm text-slate-500">
    <a href="/admin/categories?tab=<?= $currentTab ?>"
        class="hover:text-primary transition-colors flex items-center gap-1">
        <i class="fa-solid fa-house"></i> Всички
    </a>

    <?php if ($currentParentModel):
        $ancestors = [];
        $temp = $currentParentModel;
        while ($temp) {
            $ancestors[] = $temp;
            $temp = $temp->parent;
        }
        $ancestors = array_reverse($ancestors);

        foreach ($ancestors as $ancestor):
            $params = $_GET;
            $params['parent_id'] = $ancestor->id;
            $url = '/admin/categories?' . http_build_query($params);
            ?>
            <span class="mx-2 text-slate-300">/</span>
            <a href="<?= $url ?>" class="hover:text-primary transition-colors">
                <?= htmlspecialchars($ancestor->name) ?>
            </a>
        <?php endforeach; 
    endif; ?>
</nav>

<?php
$columns = [
    'name'   => 'Категория',
    'slug'   => [
        'label' => 'Slug',
        'sortable' => false
    ],
    'status' => [
        'label' => 'Статус',
        'sortable' => false
    ],
    'actions'=> [
        'label' => 'Действия',
        'sortable' => false
    ]
];

Table::header();
Table::thead($columns);

$colspan = count($columns);

Table::tbody($categories, $colspan, function ($category) {
    ob_start();
    $isDeleted = !is_null($category->deleted_at);
    $currentParams = $_GET;
    $currentParams['parent_id'] = $category->id;
    $newQueryString = http_build_query($currentParams);
    ?>
    <tr class="hover:bg-slate-50 transition-colors">
        <?php
        $hasHidden = $category->hasHiddenChildren();
        
        $nameHtml = '
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center font-bold overflow-hidden shrink-0">
                    ' . ($category->image_url ? '<img src="' . $category->image_url . '" class="w-full h-full object-cover">' : Str::initial($category->name)) . '
                </div>
                <div>
                    <div class="font-medium text-slate-900 flex items-center gap-2">
                        ' . ($category->children->isNotEmpty()
                            ? '<a href="/admin/categories?' . $newQueryString . '" class="hover:text-blue-500 transition-colors flex items-center gap-1">
                                    ' . htmlspecialchars($category->name) . '
                                    <i class="fa-solid fa-chevron-right text-[10px] opacity-50"></i>
                               </a>'
                            : htmlspecialchars($category->name)
                        ) . '
                        ' . ($hasHidden ? '<span class="text-[10px] text-orange-500 font-semibold bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">Съдържа скрити</span>' : '') . '
                    </div>
                    <div class="text-xs text-slate-500">' . ($category->parent ? 'Родител: ' . htmlspecialchars($category->parent->name) : 'Основна') . '</div>
                </div>
            </div>
        ';
        Table::td($nameHtml);
        ?>

        <?php
        Table::td('<code class="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">' . htmlspecialchars($category->slug) . '</code>'); 
        ?>

        <?php
        Table::td('
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ' . ($isDeleted ? 'bg-red-100 text-red-700' : ($category->is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600')) . '">
                <span class="w-1.5 h-1.5 rounded-full ' . ($isDeleted ? 'bg-red-500' : ($category->is_active ? 'bg-green-500' : 'bg-slate-400')) . '"></span>
                ' . ($isDeleted ? 'Изтрита' : ($category->is_active ? 'Активна' : 'Скрита')) . '
            </span>
        '); 
        ?>

        <?php
        ob_start();
        ?>
        <div class="flex items-center justify-end gap-1"> 
            <?php if ($isDeleted): ?>
                <form action="/admin/categories/restore/<?= $category->id ?>" method="POST">
                    <button class="p-2 text-slate-400 hover:text-emerald-600 transition-colors" title="Възстановяване">
                        <i class="fa-solid fa-trash-arrow-up"></i>
                    </button>
                </form>
            <?php else: ?>
                <a href="/admin/categories/edit/<?= $category->id ?>" class="p-2 text-slate-400 hover:text-primary transition-colors">
                    <i class="fa-solid fa-pen-to-square"></i>
                </a>
                <form action="/admin/categories/destroy/<?= $category->id ?>" method="POST" onsubmit="return confirm('Изтриване?')">
                    <button class="p-2 text-slate-400 hover:text-red-500 transition-colors">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </form>
            <?php endif; ?>
        </div>
        <?php
        $actions = ob_get_clean();
        Table::td($actions, 'w-32', true);
        ?>
    </tr>
    <?php 
    return ob_get_clean();
}, 'fa-folder-open');

Table::footer($categories); 
