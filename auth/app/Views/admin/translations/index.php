<?php

use App\Core\App;
use App\Core\View;
use App\Modules\Form;
use App\Modules\Str;
use App\Modules\Table;

$groupChoices = ['?' . http_build_query(array_merge($_GET, ['group' => ''])) => 'Всички групи'];

foreach ($groups as $group) {
    if (empty($group)) continue;

    $url = '?' . http_build_query(array_merge($_GET, ['group' => $group]));
    $groupChoices[$url] = "📦 " . htmlspecialchars($group);
}

$currentValue = '?' . http_build_query(array_merge($_GET, ['group' => $currentGroup]));

$currentLang = $_GET['tab'] ?? '';
$activeSource = $_GET['source'] ?? '';
$currentGroup = $_GET['group'] ?? '';
$search = $_GET['search'] ?? '';

$sourceFilters = [
    ''             => ['label' => 'Всички', 'icon' => 'fa-layer-group'],
    'static'       => ['label' => 'Статични', 'icon' => 'fa-code'],
    'dynamic'      => ['label' => 'Динамични', 'icon' => 'fa-file-lines'],
    'untranslated' => ['label' => 'Непреведени', 'icon' => 'fa-circle-exclamation'],
    'translated'   => ['label' => 'Преведени', 'icon' => 'fa-circle-check'],
];

$tabs = [
    '' => [
        'label'    => 'Всички езици',
        'title'    => 'Всички ключове',
        'subtitle' => 'Уникални ключове: {count}',
        'icon'     => 'fa-language',
        'bg'       => 'bg-slate-100',
        'text'     => 'text-slate-600'
    ]
];

foreach (array_merge([App::$defaultLang], App::$supportedLangs) as $lang) {
    $langData = LANGUAGES['data'][$lang] ?? null;
    $langName = $langData['name'] ?? strtoupper($lang);
    $isDefault = ($lang === App::$defaultLang);

    $tabs[$lang] = [
        'label'    => $langName,
        'title'    => "Преводи на {$langName}",
        'subtitle' => "Налични на {$langName}: {count}",
        'icon'     => $isDefault ? 'fa-solid fa-flag' : 'fa-solid fa-globe',
        'bg'       => $isDefault ? 'bg-emerald-50' : 'bg-indigo-50',
        'border'   => $isDefault ? 'border-emerald-100' : 'border-indigo-100',
        'text'     => $isDefault ? 'text-emerald-700' : 'text-indigo-700'
    ];
}

Table::pageHeader([
    'base_url'    => '/admin/translations',
    'count'       => $translations->total(),
    'show_create' => true,
    'create_btn'  => [
        'url'   => '/admin/translations/create',
        'label' => 'Нов ключ',
        'icon'  => 'fa-plus'
    ],
    'tabs' => $tabs
]);
?>

<?php View::component('flash-messages', 'admin/components'); ?>

<div class="flex flex-wrap items-center justify-between overflow-auto gap-4 mb-4">
    <div class="flex items-center gap-4">
        <div class="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200/50">
            <?php foreach ($sourceFilters as $key => $filter): ?>
                <a href="?<?= http_build_query(array_merge($_GET, ['source' => $key])) ?>"
                    class="flex items-center gap-2 px-4 py-2 rounded-lg transition-all <?= $activeSource === $key ? 'bg-white shadow-sm text-primary font-semibold' : 'text-slate-500 hover:text-slate-700' ?>">
                    <i class="fa-solid <?= $filter['icon'] ?> opacity-50"></i>
                    <?= $filter['label'] ?>
                </a>
            <?php endforeach; ?>
        </div>

        <div class="relative min-w-50">
            <?php Form::select('', 'group_filter', $groupChoices, $currentValue, [
                'id' => 'group-select',
                'class' => 'onchange-redirect'
            ]); ?>
        </div>
    </div>
</div>

<div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <table class="w-full text-left border-collapse">
        <?php
        $valueLabel = ($currentLang && $currentLang !== 'bg')
            ? 'Превод (' . (App::$langNames[$currentLang] ?? strtoupper($currentLang)) . ')'
            : 'Основен текст (BG)';

        Table::thead([
            'translation_key' => 'Системен ключ / Група',
            'display_value'   => $valueLabel,
            'available_langs' => 'Наличност',
            'Действия'
        ]);
        ?>

        <?php Table::tbody($translations, 4, function ($item) use ($currentLang) {
            $defaultLang = App::$defaultLang;
            $targetValue = $item->display_value;
            $translatedCodes = array_map('trim', explode(',', $item->available_langs ?? ''));

            ob_start();
        ?>
            <tr class="hover:bg-slate-50 transition-colors">

                <?php ob_start(); ?>
                <div class="flex flex-col gap-1.5">
                    <div class="font-mono text-[10px] text-primary bg-primary/5 px-2 py-0.5 rounded inline-block border border-primary/10 leading-tight w-fit">
                        <?= htmlspecialchars($item->translation_key) ?>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <span class="text-[9px] font-bold uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                            <i class="fa-solid fa-folder-open text-[8px] opacity-70"></i>
                            <?= htmlspecialchars($item->group_key ?? 'Без група') ?>
                        </span>
                        <?php if ($item->source === 'dynamic'): ?>
                            <span class="text-[9px] font-black uppercase text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">Динамичен</span>
                        <?php else: ?>
                            <span class="text-[9px] font-black uppercase text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">Статичен</span>
                        <?php endif; ?>
                    </div>
                </div>
                <?php Table::td(ob_get_clean()); ?>

                <?php ob_start(); ?>
                <div class="flex flex-col gap-2">
                    <div class="flex flex-col">
                        <div class="flex items-center gap-1 text-[9px] uppercase text-slate-400 font-bold tracking-wider">
                            <span class="bg-slate-100 px-1 rounded text-slate-500">
                                <?= LANGUAGES['data']['bg']['name'] ?? 'Български' ?>
                            </span>
                        </div>
                        <div class="text-slate-600 text-sm font-medium mt-0.5">
                            <?= htmlspecialchars($item->base_value ?: '—') ?>
                        </div>
                    </div>

                    <?php if ($currentLang && $currentLang !== 'bg'):
                        $langNames = App::getLangNames();
                        $currentLangName = $langNames[$currentLang] ?? strtoupper($currentLang);
                    ?>
                        <div class="flex flex-col border-t border-slate-50 pt-1.5">
                            <div class="flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider text-primary/60">
                                <span class="bg-primary/5 px-1 rounded"><?= $currentLangName ?></span>
                            </div>
                            <div class="text-slate-900 text-sm font-bold mt-0.5">
                                <?php if ($targetValue): ?>
                                    <?= Str::limit($targetValue, 150) ?>
                                <?php else: ?>
                                    <span class="text-red-400 italic text-xs flex items-center gap-1">
                                        <i class="fa-solid fa-circle-exclamation"></i> Липсва превод на <?= $currentLangName ?>
                                    </span>
                                <?php endif; ?>
                            </div>
                        </div>
                    <?php endif; ?>
                </div>
                <?php Table::td(ob_get_clean()); ?>

                <?php ob_start();
                $allLangs = array_merge([App::$defaultLang], App::$supportedLangs);
                $translatedCodes = array_map('trim', explode(',', $item->available_langs ?? ''));
                ?>
                <div class="flex items-center -space-x-1.5 py-1">
                    <?php foreach ($allLangs as $code):
                        $hasContent = in_array($code, $translatedCodes);
                        $langData = LANGUAGES['data'][$code] ?? null;
                        if (!$langData) continue;

                        $statusClass = $hasContent
                            ? "border-emerald-500 opacity-100 z-10"
                            : "border-slate-200 opacity-20 grayscale hover:opacity-50";
                    ?>
                        <div class="relative inline-block group" title="<?= $langData['name'] ?>: <?= $hasContent ? 'Преведено' : 'Липсва' ?>">
                            <div class="w-6 h-6 rounded-full border bg-white overflow-hidden transition-all duration-200 transform group-hover:-translate-y-1 group-hover:scale-125 group-hover:z-30 shadow-sm <?= $statusClass ?>">
                                <img src="<?= $langData['flag'] ?>" class="w-full h-full object-cover" alt="<?= $code ?>">
                            </div>

                            <?php if ($hasContent): ?>
                                <span class="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border border-white rounded-full z-20"></span>
                            <?php endif; ?>
                        </div>
                    <?php endforeach; ?>
                </div>
                <?php Table::td(ob_get_clean()); ?>

                <?php ob_start(); ?>
                <div class="flex items-center justify-end gap-1">
                    <a href="/admin/translations/edit/<?= urlencode($item->translation_key) ?>" class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </a>
                    <button type="button" onclick="confirmDeleteKey('<?= addslashes($item->translation_key) ?>')" class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
                <?php Table::td(ob_get_clean(), '', true); ?>

            </tr>
        <?php return ob_get_clean();
        }, 'fa-language'); ?>
    </table>
</div>

<?php Table::footer($translations); ?>

<script>
    function confirmDeleteKey(key) {
        if (confirm('ВНИМАНИЕ: Ще изтриете ключа "' + key + '" и всички свързани преводи! Сигурни ли сте?')) {
            window.location.href = '/admin/translations/destroy/' + encodeURIComponent(key);
        }
    }

    document.getElementById('group-select').addEventListener('change', function() {
        if (this.value) location.href = this.value;
    });
</script>