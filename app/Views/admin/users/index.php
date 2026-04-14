<?php

use App\Core\View;
use App\Models\User;
use App\Modules\Str;
use App\Modules\Table;

$currentTab = $_GET['tab'] ?? 'all';
$search = $_GET['search'] ?? '';

Table::pageHeader([
    'base_url' => '/admin/users',
    'count'    => ($currentTab === 'sessions') ? count($sessions) : $users->total(),
    'show_create' => ($currentTab !== 'sessions'),
    'create_btn' => [
        'url'   => '/admin/users/create',
        'label' => 'Нов потребител',
        'icon'  => 'fa-user-plus'
    ],
    'tabs' => [
        'all'      => ['label' => 'Всички', 'title' => 'Всички потребители', 'subtitle' => 'Общо регистрирани: {count}', 'icon' => 'fa-users', 'bg' => 'bg-primary/10', 'text' => 'text-primary'],
        'active'   => ['label' => 'Активни', 'title' => 'Активни потребители', 'subtitle' => 'Активни профили: {count}', 'icon' => 'fa-user-check', 'bg' => 'bg-emerald-50', 'text' => 'text-emerald-600'],
        'inactive' => ['label' => 'Неактивни', 'title' => 'Неактивни потребители', 'subtitle' => 'Неактивни профили: {count}', 'icon' => 'fa-user-slash', 'bg' => 'bg-orange-50', 'text' => 'text-orange-500'],
        'sessions' => ['label' => 'Сесии', 'badge' => 'Online', 'title' => 'Активни сесии', 'subtitle' => 'В момента има {count} активни устройства.', 'icon' => 'fa-user-clock', 'bg' => 'bg-emerald-50', 'text' => 'text-emerald-500']
    ]
]);
?>

<?php View::component('flash-messages', 'admin/components'); ?>

<div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <table class="w-full text-left border-collapse">

        <?php if ($currentTab === 'sessions'): ?>
            <?php Table::thead(['user' => 'Потребител', 'ip' => 'IP Адрес', 'activity' => 'Последна активност', '' => 'Действия']); ?>

            <?php Table::tbody($sessions, 4, function ($session) {
                ob_start(); ?>
                <tr class="hover:bg-slate-50 transition-colors">
                    <?php Table::td('
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-slate-100 text-primary rounded-full flex items-center justify-center font-bold shrink-0">' . Str::initial($session->user->name) . '</div>
                            <div class="truncate">
                                <div class="font-medium text-slate-900">' . htmlspecialchars($session->user->name) . '</div>
                                <div class="text-xs text-slate-500 truncate max-w-50">' . htmlspecialchars($session->user_agent) . '</div>
                            </div>
                        </div>
                    '); ?>

                    <?php Table::td($session->ip_address, 'font-mono text-xs text-slate-600'); ?>

                    <?php Table::td('
                        <span class="flex items-center gap-1.5 text-emerald-600 font-medium">
                            <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>' . date('H:i:s', $session->last_activity) . '
                        </span>
                    '); ?>

                    <?php Table::td('
                        <div class="flex justify-end italic">
                            ' . ($session->id !== session_id() ? '
                                <form action="/admin/users/terminate-session" method="POST" onsubmit="return confirm(\'Прекъсване?\')">
                                    <input type="hidden" name="session_id" value="' . $session->id . '">
                                    <button class="p-2 text-slate-400 hover:text-red-500"><i class="fa-solid fa-right-from-bracket"></i></button>
                                </form>' : '<span class="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">ТЕКУЩА</span>') . '
                        </div>
                    ', '', true); ?>
                </tr>
            <?php return ob_get_clean();
            }, 'fa-ghost'); ?>

        <?php else: ?>
            <?php Table::thead(['name' => 'Потребител', 'role' => 'Роля', 'is_active' => 'Статус', 'Действия']); ?>

            <?php Table::tbody($users, 4, function ($user) {
                $role = $user->getRoleData();
                $status = $user->getStatusData();
                ob_start();
            ?>
                <tr class="hover:bg-slate-50 transition-colors">
                    <?php Table::td('
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-slate-100 text-primary rounded-full flex items-center justify-center font-bold">' . Str::initial($user->name) . '</div>
                            <div>
                                <div class="font-medium text-slate-900">' . htmlspecialchars($user->name) . '</div>
                                <div class="text-xs text-slate-500">' . htmlspecialchars($user->email) . '</div>
                            </div>
                        </div>
                    '); ?>

                    <?php Table::td('<span class="px-2.5 py-1 rounded-md text-sm font-semibold border ' . $role['class'] . '">' . $role['label'] . '</span>'); ?>

                    <?php Table::td('
                        <span class="flex items-center gap-1.5 ' . $status['color'] . ' font-medium">
                            <span class="w-1.5 h-1.5 ' . $status['dot'] . ' rounded-full"></span>' . $status['label'] . '
                        </span>
                    '); ?>

                    <?php
                    $currentAdminId = (int)($_SESSION['user_id'] ?? 0);
                    $isProtected = ($user->id === $currentAdminId || $user->role === User::ROLE_ADMIN);

                    // Подготвяме променливите за статуса, за да избегнем подчертаването в HTML
                    $statusClasses = $user->is_active
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-700';

                    $statusIcon = $user->is_active ? 'fa-circle-check' : 'fa-circle-minus';
                    $statusText = $user->is_active ? 'Активен' : 'Деактивиран';

                    ob_start();
                    ?>

                    <div class="flex items-center justify-end gap-4">
                        <?php if (!$isProtected): ?>
                            <form action="/admin/users/update-is-active/<?= $user->id ?>" method="POST" class="inline-flex items-center">
                                <input type="hidden" name="is_active" value="<?= $user->is_active ? '0' : '1' ?>">

                                <button type="submit"
                                    class="group flex items-center gap-2 px-3 py-1.5 text-xs font-semibold transition-all duration-200 rounded-full <?= $statusClasses ?>">

                                    <i class="fa-solid <?= $statusIcon ?> transition-transform group-hover:scale-110"></i>
                                    <span><?= $statusText ?></span>
                                </button>
                            </form>
                        <?php else: ?>
                            <span class="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-50 rounded-full border border-slate-200">
                                <i class="fa-solid fa-shield-halved"></i>
                                Системен
                            </span>
                        <?php endif; ?>

                        <div class="flex gap-1 border-l pl-4 border-slate-200">
                            <a href="/admin/users/edit/<?= $user->id ?>"
                                class="p-2 text-slate-400 hover:text-primary transition-colors"
                                title="Редактиране">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </a>

                            <?php if (!$isProtected): ?>
                                <button type="button"
                                    onclick="confirmDelete(<?= $user->id ?>)"
                                    class="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                    title="Изтриване">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>

                                <form id="delete-form-<?= $user->id ?>"
                                    action="/admin/users/destroy/<?= $user->id ?>"
                                    method="POST"
                                    style="display: none;">
                                </form>
                            <?php endif; ?>

                            <script>
                                function confirmDelete(userId) {
                                    if (confirm('Сигурни ли сте, че искате да изтриете този профил?')) {
                                        document.getElementById('delete-form-' + userId).submit();
                                    }
                                }
                            </script>
                        </div>
                    </div>

                    <?php
                    $html = ob_get_clean();
                    Table::td($html, '', true);
                    ?>
                </tr>
            <?php return ob_get_clean();
            }, 'fa-users-slash'); ?>
        <?php endif; ?>

    </table>
</div>

<?php if ($currentTab !== 'sessions') Table::footer($users); ?>
