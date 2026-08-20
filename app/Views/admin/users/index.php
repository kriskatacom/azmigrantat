<?php

use App\Core\View;
use App\Models\User;
use App\Modules\Str;
use App\Modules\Table;

$currentTab = $_GET['tab'] ?? 'all';
$search = $_GET['search'] ?? '';

Table::pageHeader([
    'base_url' => '/admin/users',
    'count' => $users->total(),
    'show_create' => true,
    'create_btn' => [
        'url' => '/admin/users/create',
        'label' => 'Нов потребител',
        'icon' => 'fa-user-plus'
    ],
    'tabs' => [
        'all' => ['label' => 'Всички', 'title' => 'Всички потребители', 'subtitle' => 'Общо регистрирани: {count}', 'icon' => 'fa-users', 'bg' => 'bg-primary/10', 'text' => 'text-primary'],
        'active' => ['label' => 'Активни', 'title' => 'Активни потребители', 'subtitle' => 'Активни профили: {count}', 'icon' => 'fa-user-check', 'bg' => 'bg-emerald-50', 'text' => 'text-emerald-600'],
        'inactive' => ['label' => 'Неактивни', 'title' => 'Неактивни потребители', 'subtitle' => 'Неактивни профили: {count}', 'icon' => 'fa-user-slash', 'bg' => 'bg-orange-50', 'text' => 'text-orange-500'],
        'trash' => ['label' => 'Кошче', 'title' => 'Потребители в кошчето', 'subtitle' => 'Изтрити профили: {count}', 'icon' => 'fa-trash', 'bg' => 'bg-red-50', 'text' => 'text-red-500'],
    ]
]);

View::component('flash-messages', 'admin/components');

$columns = [
    'name' => 'Потребител',
    'role' => [
        'label' => 'Роля',
        'sortable' => false
    ],
    'is_active' => [
        'label' => 'Статус',
        'sortable' => false
    ],
    'actions' => [
        'label' => 'Действия',
        'sortable' => false
    ]
];

Table::header();
Table::thead($columns);

$colspan = count($columns);

Table::tbody($users, $colspan, function ($user) {
    $role = $user->getRoleData();
    $status = $user->getStatusData();
    ob_start();
    ?>
    <tr class="hover:bg-slate-50 transition-colors">
        <?php
        Table::td('
            <div class="flex items-center gap-3">
                <a href="/admin/users/edit/' . $user->id . '" class="flex items-center gap-3 group">
                    <div class="w-10 h-10 bg-slate-100 text-primary rounded-full flex items-center justify-center font-bold shrink-0 group-hover:scale-110 transition-transform">' . Str::initial($user->name) . '</div>
                    <div>
                        <div class="font-medium text-slate-900 group-hover:text-primary transition-colors">' . htmlspecialchars($user->name) . '</div>
                        <div class="text-xs text-slate-500">' . htmlspecialchars($user->email) . '</div>
                    </div>
                </a>
            </div>
        ');
        ?>

        <?php
        Table::td('<span class="px-2.5 py-1 rounded-md text-sm font-semibold border ' . $role['class'] . '">' . $role['label'] . '</span>');
        ?>

        <?php
        Table::td('
    <span class="flex items-center gap-1.5 ' . ($user->trashed() ? 'text-red-600' : $status['color']) . ' font-medium">
        <span class="w-1.5 h-1.5 ' . ($user->trashed() ? 'bg-red-500' : $status['dot']) . ' rounded-full"></span>' . ($user->trashed() ? 'Изтрит' : $status['label']) . '
    </span>
');
        ?>

        <?php
        $currentAdminId = (int) ($_SESSION['user_id'] ?? 0);
        $isProtected = ($user->id === $currentAdminId || $user->role === User::ROLE_ADMIN);

        $statusClasses = $user->is_active
            ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-700';

        $statusIcon = $user->is_active ? 'fa-circle-check' : 'fa-circle-minus';
        $statusText = $user->is_active ? 'Активен' : 'Деактивиран';

        ob_start();
        ?>
        <div class="flex items-center justify-end gap-4">
            <?php if ($user->trashed()): ?>
                <div class="flex gap-1">
                    <form action="/admin/users/restore/<?= $user->id ?>" method="POST">
                        <button class="p-2 text-slate-400 hover:text-emerald-500 transition-colors"
                            title="Възстанови потребителя">
                            <i class="fa-solid fa-trash-arrow-up text-sm"></i>
                        </button>
                    </form>
                    <form action="/admin/users/force-delete/<?= $user->id ?>" method="POST"
                        onsubmit="return confirm('Наистина ли искате да изтриете този потребител ЗАВИНАГИ? Действието е необратимо.')">
                        <button class="p-2 text-slate-400 hover:text-red-600 transition-colors" title="Изтрий завинаги">
                            <i class="fa-solid fa-circle-xmark text-sm"></i>
                        </button>
                    </form>
                </div>
            <?php else: ?>
                <?php if (!$isProtected): ?>
                    <form action="/admin/users/update-is-active/<?= $user->id ?>" method="POST" class="inline-flex items-center">
                        <input type="hidden" name="is_active" value="<?= $user->is_active ? '0' : '1' ?>">
                        <button type="submit"
                            class="group flex items-center gap-2 px-3 py-1.5 text-xs font-semibold transition-all duration-200 rounded-full <?= $statusClasses ?>">
                            <i class="fa-solid <?= $statusIcon ?> transition-transform group-hover:scale-110"></i>
                            <span>
                                <?= $statusText ?>
                            </span>
                        </button>
                    </form>
                <?php else: ?>
                    <span
                        class="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-50 rounded-full border border-slate-200">
                        <i class="fa-solid fa-shield-halved"></i>
                        Системен
                    </span>
                <?php endif; ?>

                <div class="flex gap-1 border-l pl-4 border-slate-200">
                    <a href="/admin/users/edit/<?= $user->id ?>" class="p-2 text-slate-400 hover:text-primary transition-colors"
                        title="Редактиране">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </a>

                    <?php if (!$isProtected): ?>
                        <form action="/admin/users/destroy/<?= $user->id ?>" method="POST"
                            onsubmit="return confirm('Сигурни ли сте, че искате да преместите този потребител в кошчето?')">
                            <button type="submit" class="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                title="Премести в кошчето">
                                <i class="fa-solid fa-trash text-sm"></i>
                            </button>
                        </form>
                    <?php endif; ?>
                </div>
            <?php endif; ?>
        </div>
        <?php
        $actionsHtml = ob_get_clean();
        Table::td($actionsHtml, '', true);
        ?>
    </tr>
    <?php
    return ob_get_clean();
}, 'fa-users-slash');

Table::footer($users);