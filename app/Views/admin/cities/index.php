<?php

use App\Core\View;
use App\Modules\Table;

$search = $_GET['search'] ?? '';
$currentTab = $_GET['tab'] ?? 'all';

Table::pageHeader([
    'base_url' => '/admin/cities',
    'count' => $cities->total(),
    'show_create' => ($currentTab !== 'trash'),
    'create_btn' => [
        'url' => '/admin/cities/create',
        'label' => 'Нов град/село',
        'icon' => 'fa-plus'
    ],
    'tabs' => [
        'all' => [
            'label' => 'Всички',
            'title' => 'Всички населени места',
            'subtitle' => 'Общ брой записи: {count}',
            'icon' => 'fa-list-ul',
            'bg' => 'bg-slate-100',
            'text' => 'text-slate-600'
        ],
        'regions' => [
            'label' => 'Области',
            'title' => 'Области / Региони',
            'subtitle' => 'Намерени области: {count}',
            'icon' => 'fa-map-location-dot',
            'bg' => 'bg-indigo-50',
            'text' => 'text-indigo-600'
        ],
        'cities' => [
            'label' => 'Градове',
            'title' => 'Само градове',
            'subtitle' => 'Намерени градове: {count}',
            'icon' => 'fa-building-shield',
            'bg' => 'bg-emerald-50',
            'text' => 'text-emerald-600'
        ],
        'villages' => [
            'label' => 'Села',
            'title' => 'Само села',
            'subtitle' => 'Намерени села: {count}',
            'icon' => 'fa-tree',
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
        // Добавяме колоната 'country' в масива с колони
        $columns = [
            'name' => 'Населено място',
            'type' => 'Тип',
            'parent' => 'Родител',
            'country' => 'Държава', // Новата колона
            'slug' => 'Slug / URL',
            'sort_order' => 'Подредба',
            'actions' => 'Действия'
        ];
        Table::thead($columns);
        ?>

        <?php Table::tbody($cities, count($columns), function ($city) {
            ob_start();
            $image = $city->options['image_desktop'] ?? null;

            // Взимаме името на държавата безопасно. 
            // Ако релацията $city->country е заредена, я ползваме, иначе търсим директно Country модела по ID от JSON
            $countryName = '—';
            if ($city->relationLoaded('country') && $city->country) {
                $countryName = $city->country->name;
            } elseif (!empty($city->options['country_id'])) {
                $country = \App\Models\Country::find($city->options['country_id']);
                if ($country) {
                    $countryName = $country->name;
                }
            }
            ?>
            <tr class="hover:bg-slate-50 transition-colors">
                <?php Table::td('
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
                            ' . ($image
                    ? '<img src="' . $image . '" class="w-full h-full object-cover">'
                    : '<i class="fa-solid fa-mountain-city text-slate-400 text-lg"></i>') . '
                        </div>
                        <div>
                            <div class="font-medium text-slate-900">' . htmlspecialchars($city->getTranslatedName()) . '</div>
                            <div class="text-xs text-slate-500">ID: #' . $city->id . '</div>
                        </div>
                    </div>
                '); ?>

                <?php Table::td('
                    <span class="text-xs px-2 py-1 rounded font-medium ' . match ($city->type) {
                    'region' => 'bg-indigo-50 text-indigo-700',
                    'city' => 'bg-emerald-50 text-emerald-700',
                    'village' => 'bg-amber-50 text-amber-700',
                    default => 'bg-slate-100 text-slate-700'
                } . '">
                        ' . $city->getTypeName() . '
                    </span>
                '); ?>

                <?php Table::td($city->parent ? htmlspecialchars($city->parent->name) : '<span class="text-slate-400">—</span>'); ?>

                <?php Table::td('
                    <div class="flex items-center gap-1.5 text-slate-700 font-medium text-sm">
                        <i class="fa-solid fa-globe text-slate-400 text-xs"></i>
                        ' . htmlspecialchars($countryName) . '
                    </div>
                '); ?>

                <?php Table::td('
                    <code class="text-[11px] bg-slate-100 px-2 py-1 rounded text-slate-600">
                        ' . $city->slug . '
                    </code>
                '); ?>

                <?php Table::td('
                    <div class="flex items-center gap-2">
                        <span class="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-full text-xs font-bold border border-blue-100">
                            ' . $city->sort_order . '
                        </span>
                    </div>
                '); ?>

                <td class="p-4 text-right">
                    <div class="flex justify-end gap-2">
                        <?php if ($city->trashed()): ?>
                            <form action="/admin/cities/restore/<?= $city->id ?>" method="POST" class="inline">
                                <button type="submit" class="p-2 text-slate-400 hover:text-emerald-500 transition-colors"
                                    title="Възстановяване">
                                    <i class="fa-solid fa-rotate-left"></i>
                                </button>
                            </form>

                            <form action="/admin/cities/force-delete/<?= $city->id ?>" method="POST"
                                onsubmit="return confirm('ВНИМАНИЕ: Това населено място ще бъде изтрито окончателно!')"
                                class="inline">
                                <button type="submit" class="p-2 text-slate-400 hover:text-red-600 transition-colors"
                                    title="Изтрий окончателно">
                                    <i class="fa-solid fa-circle-xmark"></i>
                                </button>
                            </form>
                        <?php else: ?>
                            <a href="/admin/cities/edit/<?= $city->id ?>"
                                class="p-2 text-slate-400 hover:text-primary transition-colors" title="Редактиране">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </a>

                            <form action="/admin/cities/delete/<?= $city->id ?>" method="POST"
                                onsubmit="return confirm('Сигурни ли сте, че искате да преместите този град в кошчето?')"
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
        }, 'fa-mountain-city'); ?>

    </table>
</div>

<?php Table::footer($cities); ?>