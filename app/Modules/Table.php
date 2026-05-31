<?php

namespace App\Modules;

use App\Core\View;

class Table
{
    public static function pageHeader(array $config)
    {
        $currentTab = $_GET['tab'] ?? ($config['default_tab'] ?? 'all');
        $search = $_GET['search'] ?? '';
        $tabs = $config['tabs'] ?? [];

        $style = $tabs[$currentTab] ?? ($tabs['all'] ?? [
            'bg' => 'bg-primary/10',
            'text' => 'text-primary',
            'icon' => 'fa-list',
            'title' => 'Списък'
        ]);
        ?>
        <div class="mb-5 flex items-start gap-5">
            <div
                class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 <?= $style['bg'] ?> <?= $style['text'] ?>">
                <i class="fa-solid <?= $style['icon'] ?> text-xl"></i>
            </div>
            <div>
                <h1 class="text-2xl font-bold text-slate-900"><?= $style['title'] ?></h1>
                <p class="text-sm font-medium text-slate-500">
                    <?= str_replace('{count}', '<span class="font-bold border-b border-dotted">' . ($config['count'] ?? 0) . '</span>', $style['subtitle'] ?? '') ?>
                </p>
            </div>
        </div>

        <div class="flex items-center overflow-auto mb-6 gap-2 p-1 bg-slate-100/50 rounded-lg">
            <?php foreach ($tabs as $key => $tab): ?>
                <a href="?tab=<?= $key ?>" class="inline-flex items-center px-4 py-2 text-sm font-semibold transition-all duration-200 rounded-md whitespace-nowrap
            <?= $currentTab === $key
                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900' ?>">

                    <?= $tab['label'] ?>

                    <?php if (isset($tab['badge'])): ?>
                        <span class="ml-2 px-2 py-0.5 text-[10px] rounded-full font-bold shadow-sm
                    <?= $currentTab === $key ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600' ?>">
                            <?= $tab['badge'] ?>
                        </span>
                    <?php endif; ?>
                </a>
            <?php endforeach; ?>
        </div>

        <div class="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <form action="<?= $config['base_url'] ?>" method="GET" class="flex items-end gap-3 flex-1 md:flex-none">
                <input type="hidden" name="tab" value="<?= htmlspecialchars($currentTab) ?>">
                <div class="w-full md:w-80">
                    <?php Form::input('', 'search', $search, 'text', ['placeholder' => 'Търсене...']); ?>
                </div>
                <div class="pb-px">
                    <?php Form::submit('Търси', 'fa-magnifying-glass'); ?>
                </div>
            </form>

            <?php if (isset($config['create_btn']) && ($config['show_create'] ?? true)): ?>
                <a href="<?= $config['create_btn']['url'] ?>"
                    class="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
                    <i class="fa-solid <?= $config['create_btn']['icon'] ?? 'fa-plus' ?>"></i>
                    <?= $config['create_btn']['label'] ?>
                </a>
            <?php endif; ?>
        </div>
        <?php
    }

    public static function header(string $title, string $subtitle, string $searchAction, string $searchValue = '')
    {
        $sort = $_GET['sort'] ?? '';
        $order = $_GET['order'] ?? '';
        ?>
        <div class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 class="text-2xl font-bold text-slate-900"><?= $title ?></h1>
                <p class="text-slate-500 text-sm"><?= $subtitle ?></p>
            </div>

            <form action="<?= $searchAction ?>" method="GET" class="relative">
                <?php if ($sort): ?>
                    <input type="hidden" name="sort" value="<?= htmlspecialchars($sort) ?>">
                    <input type="hidden" name="order" value="<?= htmlspecialchars($order) ?>">
                <?php endif; ?>

                <input type="text" name="search" value="<?= htmlspecialchars($searchValue) ?>" placeholder="Търсене..."
                    class="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg w-full md:w-80 focus:ring-2 focus:ring-primary outline-none transition-all">
                <i class="fa-solid fa-magnifying-glass absolute left-3 top-3 text-slate-400"></i>
            </form>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table class="w-full text-left border-collapse">
                <?php
    }

    public static function thead(array $columns)
    {
        $sort = $_GET['sort'] ?? '';
        $order = $_GET['order'] ?? 'asc';

        ?>
                <thead>
                    <tr class="bg-slate-50 border-b border-slate-200">
                        <?php foreach ($columns as $dbField => $label): ?>
                            <?php
                            $isSortable = !is_numeric($dbField);
                            $isActive = ($sort === $dbField);
                            $nextOrder = ($isActive && $order === 'asc') ? 'desc' : 'asc';

                            $queryParams = array_merge($_GET, ['sort' => $dbField, 'order' => $nextOrder]);
                            $sortUrl = '?' . http_build_query($queryParams);
                            ?>
                            <th
                                class="p-4 font-semibold text-slate-700 <?= empty($dbField) || is_numeric($dbField) ? 'text-right' : '' ?>">
                                <?php if ($isSortable): ?>
                                    <a href="<?= $sortUrl ?>"
                                        class="flex items-center gap-1 hover:text-primary transition-colors group">
                                        <?= $label ?>
                                        <span class="text-slate-300 group-hover:text-primary/50">
                                            <?php if ($isActive): ?>
                                                <i class="fa-solid fa-sort-<?= $order === 'asc' ? 'up' : 'down' ?> text-primary"></i>
                                            <?php else: ?>
                                                <i class="fa-solid fa-sort text-xs opacity-50"></i>
                                            <?php endif; ?>
                                        </span>
                                    </a>
                                <?php else: ?>
                                    <?= $label ?>
                                <?php endif; ?>
                            </th>
                        <?php endforeach; ?>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                    <?php
    }

    public static function footer($items)
    {
        ?>
                </tbody>
            </table>
        </div>
        <div class="mt-4">
            <?php View::component('pagination', 'admin/partials', ['items' => $items]); ?>
        </div>
        <?php
    }

    public static function tbody($items, int $colspan, callable $rowRender, string $emptyIcon = 'fa-folder-open')
    {
        ?>
        <tbody class="divide-y divide-slate-100">
            <?php if ($items && count($items) > 0): ?>
                <?php foreach ($items as $item): ?>
                    <?= $rowRender($item) ?>
                <?php endforeach; ?>
            <?php else: ?>
                <?php self::emptyState($colspan, $emptyIcon); ?>
            <?php endif; ?>
        </tbody>
        <?php
    }

    public static function td($content, string $class = '', bool $isRight = false)
    {
        $alignClass = $isRight ? 'text-right' : 'text-left';
        $finalClass = "p-4 {$alignClass} {$class}";

        echo "<td class=\"" . trim($finalClass) . "\">";
        echo $content;
        echo "</td>";
    }

    public static function emptyState(int $colspan, string $defaultIcon = 'fa-folder-open')
    {
        $search = $_GET['search'] ?? '';
        $icon = !empty($search) ? 'fa-magnifying-glass' : $defaultIcon;

        $title = !empty($search)
            ? 'Няма намерени резултати'
            : 'Списъкът е празен';

        $message = !empty($search)
            ? 'Не открихме нищо, съвпадащо с "<span class="font-medium text-slate-800">' . htmlspecialchars($search) . '</span>".'
            : 'В тази секция все още няма добавени записи.';
        ?>
        <tr>
            <td colspan="<?= $colspan ?>" class="p-12 text-center">
                <div class="flex flex-col items-center justify-center">
                    <div
                        class="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4 border border-dashed border-slate-200">
                        <i class="fa-solid <?= $icon ?> text-2xl"></i>
                    </div>
                    <h3 class="text-slate-900 font-semibold text-lg mb-1"><?= $title ?></h3>
                    <p class="text-slate-500 text-sm max-w-xs mx-auto"><?= $message ?></p>
                </div>
            </td>
        </tr>
        <?php
    }
}