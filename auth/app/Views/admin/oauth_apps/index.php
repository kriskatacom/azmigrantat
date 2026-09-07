<?php

use App\Modules\Table;
use App\Core\View;

$currentTab = $_GET['tab'] ?? 'all';
$search = $_GET['search'] ?? '';

Table::pageHeader([
    'base_url' => '/admin/oauth-apps',
    'count'    => $apps->total(),
    'create_btn' => ['url' => '/admin/oauth-apps/create', 'label' => 'Ново приложение', 'icon' => 'fa-plus'],
    'tabs' => [
        'all'      => ['label' => 'Всички', 'title' => 'SSO Приложения', 'subtitle' => 'Регистрирани сайтове: {count}', 'icon' => 'fa-key', 'bg' => 'bg-primary/10', 'text' => 'text-primary'],
        'active'   => ['label' => 'Активни', 'title' => 'Активни приложения', 'subtitle' => 'Достъпни: {count}', 'icon' => 'fa-circle-check', 'bg' => 'bg-emerald-50', 'text' => 'text-emerald-600'],
        'inactive' => ['label' => 'Спрени', 'title' => 'Спрени приложения', 'subtitle' => 'Деактивирани: {count}', 'icon' => 'fa-circle-xmark', 'bg' => 'bg-slate-100', 'text' => 'text-slate-500'],
        'trash'    => ['label' => 'Кошче', 'title' => 'Кошче', 'subtitle' => 'Изтрити: {count}', 'icon' => 'fa-trash-can', 'bg' => 'bg-red-50', 'text' => 'text-red-500']
    ]
]);

View::component('flash-messages', 'admin');
?>

<?php View::component('flash-messages', 'admin/components'); ?>

<div class="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
    <table class="w-full text-sm text-left">
        <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-semibold">
            <tr>
                <th class="p-4">Приложение</th>
                <th class="p-4">Client ID & Secret</th>
                <th class="p-4">Redirect URL</th>
                <th class="p-4">Статус</th>
                <th class="p-4 text-right">Действия</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
            <?php if ($apps->count() > 0): ?>
                <?php foreach ($apps as $app): ?>
                    <tr class="hover:bg-slate-50/50 transition-colors">
                        <td class="p-4">
                            <div class="font-bold text-slate-900"><?= htmlspecialchars($app->name) ?></div>
                            <div class="text-xs text-slate-400">Добавено: <?= $app->created_at->format('d.m.Y') ?></div>
                        </td>
                        <td class="p-4">
                            <code class="block text-xs bg-slate-100 p-1 rounded mb-1">ID: <?= $app->client_id ?></code>
                            <div class="group relative">
                                <span class="text-xs text-slate-400 blur-[3px] group-hover:blur-none transition-all cursor-help">
                                    Secret: <?= $app->client_secret ?>
                                </span>
                            </div>
                        </td>
                        <td class="p-4 text-slate-600 font-mono text-xs">
                            <?= htmlspecialchars($app->redirect_uri) ?>
                        </td>
                        <td class="p-4">
                            <?php if ($app->is_active): ?>
                                <span class="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                    <i class="fa-solid fa-circle text-[8px] mr-1"></i> Активно
                                </span>
                            <?php else: ?>
                                <span class="px-2 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                    <i class="fa-solid fa-circle text-[8px] mr-1 text-slate-400"></i> Спряно
                                </span>
                            <?php endif; ?>
                        </td>
                        <td class="p-4 text-right">
                            <div class="flex justify-end gap-2">
                                <?php if ($currentTab === 'trash'): ?>
                                    <form action="/admin/oauth-apps/restore/<?= $app->id ?>" method="POST">
                                        <button title="Възстановяване" class="p-2 text-slate-400 hover:text-emerald-600 transition-colors"><i class="fa-solid fa-arrow-rotate-left"></i></button>
                                    </form>
                                    <form action="/admin/oauth-apps/force-delete/<?= $app->id ?>" method="POST" onsubmit="return confirm('Изтриване завинаги?')">
                                        <button title="Окончателно изтриване" class="p-2 text-slate-400 hover:text-red-600 transition-colors"><i class="fa-solid fa-circle-xmark"></i></button>
                                    </form>
                                <?php else: ?>
                                    <a href="/admin/oauth-apps/edit/<?= $app->id ?>" class="p-2 text-slate-400 hover:text-primary transition-colors">
                                        <i class="fa-solid fa-pen"></i>
                                    </a>
                                    <form action="/admin/oauth-apps/delete/<?= $app->id ?>" method="POST" onsubmit="return confirm('Преместване в кошчето?')">
                                        <button title="Изтриване" class="p-2 text-slate-400 hover:text-red-500 transition-colors"><i class="fa-solid fa-trash"></i></button>
                                    </form>
                                <?php endif; ?>
                            </div>
                        </td>
                    </tr>
                <?php endforeach; ?>
            <?php else: ?>
                <?php Table::emptyState(5, 'fa-key'); ?>
            <?php endif; ?>
        </tbody>
    </table>
</div>

<?php Table::footer($apps); ?>
