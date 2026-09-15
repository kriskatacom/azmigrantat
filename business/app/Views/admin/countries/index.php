<?php

use App\Core\View;
use App\Modules\Table;

$search = $_GET['search'] ?? '';
$currentTab = $_GET['tab'] ?? 'all';

Table::pageHeader([
    'base_url' => '/admin/countries',
    'count' => $countries->total(),
    'show_create' => ($currentTab !== 'trash'),
    'create_btn' => [
        'url' => '/admin/countries/create',
        'label' => 'Нова държава',
        'icon' => 'fa-plus'
    ],
    'tabs' => [
        'all' => [
            'label' => 'Всички',
            'title' => 'Всички държави',
            'subtitle' => 'Общ брой записи: {count}',
            'icon' => 'fa-globe',
            'bg' => 'bg-slate-100',
            'text' => 'text-slate-600'
        ],
        'active' => [
            'label' => 'Активни',
            'title' => 'Активни държави',
            'subtitle' => 'Публикувани на сайта: {count}',
            'icon' => 'fa-circle-check',
            'bg' => 'bg-emerald-50',
            'text' => 'text-emerald-600'
        ],
        'inactive' => [
            'label' => 'Неактивни',
            'title' => 'Неактивни държави',
            'subtitle' => 'Скрити/Спрени държави: {count}',
            'icon' => 'fa-circle-xmark',
            'bg' => 'bg-amber-50',
            'text' => 'text-amber-600'
        ],
        'trash' => [
            'label' => 'Кошче',
            'title' => 'Изтрити записи',
            'subtitle' => 'В кошчето: {count}',
            'icon' => 'fa-trash-can',
            'bg' => 'bg-red-50',
            'text' => 'text-red-500'
        ]
    ]
]);
?>

<?php View::component('flash-messages', 'admin/components'); ?>

<div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <table class="w-full text-left border-collapse">

        <?php
        // Динамични заглавия според таба
        $columns = ['name' => 'Държава', 'slug' => 'Slug / URL', 'layout' => 'Шаблон'];
        if ($currentTab === 'trash') {
            $columns['deleted_at'] = 'Изтрита на';
        } else {
            $columns['order'] = 'Подредба';
        }
        $columns['actions'] = 'Действия';

        Table::thead($columns);
        ?>

        <?php Table::tbody($countries, count($columns), function ($country) use ($currentTab) {
            ob_start();
            // В таблицата countries изображението е директна колона image_url
            $image = $country->image_url ?? null;
            ?>
            <tr class="hover:bg-slate-50 transition-colors">
                <?php Table::td('
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
                            ' . ($image
                    ? '<img src="' . $image . '" class="w-full h-full object-cover">'
                    : '<i class="fa-solid fa-globe text-slate-400 text-lg"></i>') . '
                        </div>
                        <div>
                            <div class="font-medium text-slate-900">' . htmlspecialchars($country->name) . '</div>
                            <div class="text-xs text-slate-500">ID: #' . $country->id . '</div>
                        </div>
                    </div>
                '); ?>

                <?php Table::td('
                    <code class="text-[11px] bg-slate-100 px-2 py-1 rounded text-slate-600">
                        ' . $country->slug . '
                    </code>
                '); ?>

                <?php Table::td('
                    <span class="text-xs px-2.5 py-1 rounded-full font-medium ' . ($country->layout === 'primary' ? 'bg-indigo-50 border border-indigo-100' : 'bg-slate-50 text-slate-600 border-slate-100') . '">
                        ' . ($country->layout === 'primary' ? 'Главен (Primary)' : 'Стандартен (Secondary)') . '
                    </span>
                '); ?>

                <?php if ($currentTab === 'trash'): ?>
                    <?php Table::td('<span class="text-sm text-slate-500">' . $country->deleted_at->format('d.m.Y H:i') . '</span>'); ?>
                <?php else: ?>
                    <?php Table::td('
                        <div class="flex items-center gap-2">
                            <span class="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-full text-xs font-bold border border-blue-100">
                                ' . $country->sort_order . '
                            </span>
                        </div>
                    '); ?>
                <?php endif; ?>

                <td class="p-4 text-right">
                    <div class="flex justify-end gap-2">
                        <?php if ($currentTab === 'trash'): ?>
                            <form action="/admin/countries/restore/<?= $country->id ?>" method="POST" class="inline">
                                <button type="submit" class="p-2 text-slate-400 hover:text-emerald-500 transition-colors"
                                    title="Възстановяване">
                                    <i class="fa-solid fa-rotate-left"></i>
                                </button>
                            </form>

                            <form action="/admin/countries/force-delete/<?= $country->id ?>" method="POST"
                                onsubmit="return confirm('ВНИМАНИЕ: Тази държава ще бъде изтрита окончателно!')" class="inline">
                                <button type="submit" class="p-2 text-slate-400 hover:text-red-600 transition-colors"
                                    title="Изтрий окончателно">
                                    <i class="fa-solid fa-circle-xmark"></i>
                                </button>
                            </form>
                        <?php else: ?>
                            <a href="/admin/countries/edit/<?= $country->id ?>"
                                class="p-2 text-slate-400 hover:text-primary transition-colors" title="Редактиране">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </a>

                            <form action="/admin/countries/delete/<?= $country->id ?>" method="POST"
                                onsubmit="return confirm('Сигурни ли сте, че искате да преместите тази държава в кошчето?')"
                                class="inline">
                                <button type="submit" class="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                    title="Премести в кошчето">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            </form>
                        <?php endif; ?>
                    </div>
                </td>
            </tr>
            <?php return ob_get_clean();
        }, 'fa-globe'); ?>

    </table>
</div>

<?php Table::footer($countries); ?>
