<?php

use App\Core\View;
use App\Helpers\SecurityHelper;
use App\Modules\Form;
use App\Services\EnvConfig;

$sourceLabel = $activeSource === EnvConfig::SOURCE_PRODUCTION
    ? 'production (реални данни)'
    : 'development (тестови / демо данни)';
?>

<div class="fixed bottom-5 right-5 z-50">
    <?php Form::mainSubmit('Запази променливите'); ?>
</div>

<div class="mb-8">
    <h1 class="text-2xl font-bold text-slate-900">Променливи на средата</h1>
    <p class="text-sm font-medium text-slate-500 mt-1">
        Едни и същи ключове, две стойности. В момента приложението ползва
        <span class="font-semibold text-slate-700"><?= htmlspecialchars($sourceLabel) ?></span>.
        Смяната е от Настройки, не от тази страница.
    </p>
</div>

<?php View::component('flash-messages', 'admin/components'); ?>

<form action="<?= htmlspecialchars('/admin/env-variables?password=' . rawurlencode($pagePassword)) ?>"
    method="POST" data-main-form autocomplete="off">
    <?= SecurityHelper::csrfField() ?>
    <input type="hidden" name="password" value="<?= htmlspecialchars($pagePassword) ?>">

    <?php foreach ($groups as $groupName => $rows): ?>
        <?php Form::section((string) $groupName, function () use ($rows) { ?>
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="text-left text-slate-500 border-b border-slate-100">
                            <th class="py-2 pr-4 font-medium w-48">Ключ</th>
                            <th class="py-2 pr-3 font-medium">Development</th>
                            <th class="py-2 font-medium">Production</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <?php foreach ($rows as $row): ?>
                            <?php $nameBase = 'env[' . htmlspecialchars($row->var_key) . ']'; ?>
                            <tr>
                                <td class="py-3 pr-4 align-top">
                                    <div class="font-mono text-xs text-slate-800"><?= htmlspecialchars($row->var_key) ?></div>
                                    <div class="text-xs text-slate-500 mt-0.5"><?= htmlspecialchars($row->label) ?></div>
                                </td>
                                <td class="py-3 pr-3 align-top">
                                    <input type="text"
                                        name="<?= $nameBase ?>[dev]"
                                        value="<?= htmlspecialchars((string) $row->dev_value) ?>"
                                        autocomplete="off"
                                        class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none font-mono text-xs">
                                </td>
                                <td class="py-3 align-top">
                                    <input type="text"
                                        name="<?= $nameBase ?>[prod]"
                                        value="<?= htmlspecialchars((string) $row->prod_value) ?>"
                                        autocomplete="off"
                                        class="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none font-mono text-xs">
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php }, 'fa-key'); ?>
    <?php endforeach; ?>
</form>
