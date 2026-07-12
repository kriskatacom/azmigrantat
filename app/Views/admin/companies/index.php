<?php

use App\Core\View;
use App\Modules\Table;

$search = $_GET['search'] ?? '';

Table::pageHeader([
    'base_url' => '/admin/companies',
    'count' => $companies->total(),
    'show_create' => true,
    'create_btn' => [
        'url' => '/admin/companies/create',
        'label' => 'Нова компания',
        'icon' => 'fa-plus'
    ],
    'tabs' => [
        'all' => [
            'label' => 'Всички',
            'title' => 'Списък на компаниите',
            'subtitle' => 'Общ брой регистрирани фирми: {count}',
            'icon' => 'fa-building',
            'bg' => 'bg-slate-100',
            'text' => 'text-slate-600'
        ],
        'active' => [
            'label' => 'Активни',
            'title' => 'Активни компании',
            'subtitle' => 'Виждат се в публичния профил',
            'count' => $counts['published'] ?? 0,
            'url' => "/admin/companies?tab=active",
            'icon' => 'fa-check-double',
            'bg' => 'bg-emerald-100',
            'text' => 'text-emerald-600'
        ],
        'inactive' => [
            'label' => 'Неактивни',
            'title' => 'Спрени компании',
            'subtitle' => 'Скрити от потребителите',
            'count' => $counts['draft'] ?? 0,
            'url' => "/admin/companies?tab=inactive",
            'icon' => 'fa-eye-slash',
            'bg' => 'bg-slate-100',
            'text' => 'text-slate-600'
        ],
        'trash' => [
            'label' => 'Кошче',
            'title' => 'Изтрити компании',
            'subtitle' => 'Компании в кошчето',
            'count' => $counts['trash'] ?? 0,
            'icon' => 'fa-trash-can',
            'bg' => 'bg-rose-100',
            'text' => 'text-rose-600'
        ]
    ],
]);
?>

<?php View::component('flash-messages', 'admin/components'); ?>

<div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <table class="w-full text-left border-collapse">

        <?php
        $columns = [
            'name' => 'Компания',
            'location' => 'Град / Категория',
            'status' => 'Статус',
            'order' => 'Подредба',
            'actions' => 'Действия'
        ];

        Table::thead($columns);
        ?>

        <?php Table::tbody($companies, count($columns), function ($company) {
            ob_start();
            $logo = $company->image_url;
            $isActive = (bool) $company->is_active;
            ?>
            <tr class="hover:bg-slate-50 transition-colors">
                <?php Table::td('
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center overflow-hidden shrink-0 border border-slate-100">
                            ' . ($logo
                    ? '<img src="' . $logo . '" class="w-full h-full object-cover">'
                    : '<i class="fa-solid fa-briefcase text-slate-300"></i>') . '
                        </div>
                        <div>
                            <div class="font-medium text-slate-900">' . htmlspecialchars($company->name) . '</div>
                            <div class="text-xs text-slate-500">ID: #' . $company->id . '</div>
                        </div>
                    </div>
                '); ?>

                <?php Table::td('
                    <div class="flex flex-col gap-1">
                        <span class="text-sm text-slate-700 flex items-center gap-1">
                            <i class="fa-solid fa-location-dot text-xs text-slate-400"></i>
                            ' . ($company->city->name ?? '<span class="text-red-400">Няма град</span>') . '
                        </span>
                        <span class="text-[11px] text-slate-500 italic">
                            ' . ($company->category->name ?? 'Без категория') . '
                        </span>
                    </div>
                '); ?>

                <?php Table::td('
                    <div class="flex items-center">
                        ' . ($isActive
                    ? '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-bold border border-emerald-100">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Активна
                       </span>'
                    : '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-50 text-slate-500 text-[11px] font-bold border border-slate-200">
                            <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Неактивна
                       </span>') . '
                    </div>
                '); ?>

                <?php Table::td('
                    <div class="text-sm font-semibold text-slate-600">
                         ' . $company->sort_order . '
                    </div>
                '); ?>

                <td class="p-4 text-right">
                    <div class="flex justify-end gap-2">
                        <?php if ($company->deleted_at): ?>
                            <form action="/admin/companies/restore/<?= $company->id ?>" method="POST" class="inline">
                                <button type="submit" class="p-2 text-slate-400 hover:text-emerald-500 transition-colors"
                                    title="Възстановяване">
                                    <i class="fa-solid fa-trash-arrow-up"></i>
                                </button>
                            </form>

                            <form action="/admin/companies/force-delete/<?= $company->id ?>" method="POST"
                                onsubmit="return confirm('ВНИМАНИЕ: Това действие е необратимо! Сигурни ли сте?')"
                                class="inline">
                                <button type="submit" class="p-2 text-slate-400 hover:text-red-600 transition-colors"
                                    title="Окончателно изтриване">
                                    <i class="fa-solid fa-skull"></i>
                                </button>
                            </form>
                        <?php else: ?>
                            <a href="/admin/companies/<?= $company->id ?>/ads"
                                class="p-2 text-slate-400 hover:text-indigo-500 transition-colors" title="Услуги">
                                <i class="fa-solid fa-rectangle-ad"></i>
                            </a>

                            <a href="/admin/companies/edit/<?= $company->id ?>"
                                class="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Редактиране">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </a>

                            <form action="/admin/companies/delete/<?= $company->id ?>" method="POST"
                                onsubmit="return confirm('Сигурни ли сте, че искате да преместите тази компания в кошчето?')"
                                class="inline">
                                <button type="submit" class="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                    title="Изтриване">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </form>
                        <?php endif; ?>
                    </div>
                </td>
            </tr>
            <?php return ob_get_clean();
        }, 'fa-building-circle-exclamation'); ?>

    </table>
</div>

<?php Table::footer($companies); ?>
