<?php

use App\Core\App;
use App\Core\View;
use App\Modules\Str;
use App\Modules\Table;

$currentLang = $_GET['lang'] ?? '';
$activeSource = $_GET['source'] ?? '';

$sourceFilters = [
    ''        => ['label' => 'Всички', 'icon' => 'fa-layer-group'],
    'static'  => ['label' => 'Статични', 'icon' => 'fa-code'],
    'dynamic' => ['label' => 'Динамични', 'icon' => 'fa-file-lines'],
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

<div class="flex items-center gap-2 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
    <?php foreach ($sourceFilters as $key => $filter): ?>
        <a href="?<?= http_build_query(array_merge($_GET, ['source' => $key])) ?>"
            class="flex items-center gap-2 px-4 py-2 rounded-lg transition-all <?= $activeSource === $key ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700' ?>">
            <i class="fa-solid <?= $filter['icon'] ?> opacity-50"></i>
            <?= $filter['label'] ?>
        </a>
    <?php endforeach; ?>
</div>

<div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <table class="w-full text-left border-collapse">
        <?php
        $valueLabel = $currentLang
            ? 'Превод (' . (App::$langNames[$currentLang] ?? strtoupper($currentLang)) . ')'
            : 'Основен текст (BG)';

        Table::thead([
            'translation_key' => 'Системен ключ / Тип',
            'display_value'   => $valueLabel,
            'available_langs' => 'Наличност',
            'Действия'
        ]);
        ?>

        <?php Table::tbody($translations, 4, function ($item) use ($currentLang) {
            $langs = explode(', ', $item->available_langs ?? '');
            $defaultLang = App::$defaultLang;
            $targetValue = $item->display_value;

            ob_start();
        ?>
            <tr class="hover:bg-slate-50 transition-colors">

                <?php ob_start(); ?>
                <div class="flex flex-col gap-1.5">
                    <div class="font-mono text-[10px] text-primary bg-primary/5 px-2 py-0.5 rounded inline-block border border-primary/10 leading-tight w-fit">
                        <?= htmlspecialchars($item->translation_key) ?>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <?php if ($item->source === 'dynamic'): ?>
                            <span class="text-[9px] font-black uppercase text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">Динамичен</span>
                        <?php else: ?>
                            <span class="text-[9px] font-black uppercase text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">Статичен</span>
                        <?php endif; ?>
                    </div>
                </div>
                <?php Table::td(ob_get_clean()); ?>

                <?php ob_start(); ?>
                <div class="flex flex-col gap-1">
                    <?php if ($currentLang && $currentLang !== $defaultLang): ?>
                        <div class="flex items-center gap-1 text-[10px] uppercase text-slate-400 font-bold tracking-tighter">
                            <span>BG</span>
                            <div class="h-px w-4 bg-slate-200"></div>
                        </div>
                        <div class="text-slate-500 text-xs mb-1 line-clamp-1 italic">
                            <?= $item->base_value ?? '—' ?>
                        </div>
                    <?php endif; ?>

                    <div class="max-w-md text-slate-700 text-sm font-medium leading-relaxed" title="<?= htmlspecialchars($targetValue ?? '') ?>">
                        <?php if ($targetValue): ?>
                            <?= Str::limit($targetValue, 120) ?>
                        <?php else: ?>
                            <span class="text-red-400 italic text-xs flex items-center gap-1">
                                <i class="fa-solid fa-circle-exclamation"></i> Липсва превод
                            </span>
                        <?php endif; ?>
                    </div>
                </div>
                <?php Table::td(ob_get_clean()); ?>

                <?php ob_start();
                $allLangs = array_merge([App::$defaultLang], App::$supportedLangs);
                $limit = 4;
                $displayedLangs = array_slice($allLangs, 0, $limit);
                $remainingCount = count($allLangs) - $limit;

                $translatedCodes = explode(', ', $item->available_langs ?? '');
                ?>
                <div class="flex items-center -space-x-2">
                    <?php foreach ($displayedLangs as $code):
                        $hasContent = in_array(trim($code), $translatedCodes);
                        $langData = LANGUAGES['data'][$code] ?? null;
                        if (!$langData) continue;

                        $statusClass = $hasContent
                            ? "border-emerald-500 ring-2 ring-emerald-500/15 opacity-100"
                            : "border-slate-200 opacity-30 grayscale";
                    ?>
                        <div class="relative inline-block group" title="<?= $langData['name'] ?>: <?= $hasContent ? 'Преведено' : 'Липсва' ?>">
                            <div class="w-8 h-8 rounded-full border-2 overflow-hidden transition-all duration-300 transform group-hover:-translate-y-1 group-hover:z-30 group-hover:scale-110 bg-white <?= $statusClass ?>">
                                <img src="<?= $langData['flag'] ?>" class="w-full h-full object-cover" alt="<?= $code ?>">
                            </div>
                            <?php if ($hasContent): ?>
                                <span class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full z-20 shadow-sm"></span>
                            <?php endif; ?>
                        </div>
                    <?php endforeach; ?>

                    <?php if ($remainingCount > 0): ?>
                        <div class="relative z-0 group">
                            <div class="w-8 h-8 flex items-center justify-center border-2 border-slate-200 bg-slate-50 rounded-full shadow-sm ml-2 cursor-help transition-all hover:bg-slate-100"
                                title="Още: <?= implode(', ', array_slice($allLangs, $limit)) ?>">
                                <span class="text-[10px] font-black text-slate-500 tracking-tighter">+<?= $remainingCount ?></span>
                            </div>
                        </div>
                    <?php endif; ?>
                </div>
                <?php Table::td(ob_get_clean()); ?>

                <?php ob_start(); ?>
                <div class="flex items-center justify-end gap-1">
                    <a href="/admin/translations/edit/<?= urlencode($item->translation_key) ?>"
                        class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                        title="Редактиране">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </a>
                    <button type="button"
                        onclick="confirmDeleteKey('<?= addslashes($item->translation_key) ?>')"
                        class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Изтриване">
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
        if (confirm('ВНИМАНИЕ: Ще изтриете ключа "' + key + '" и всички свързани преводи! Това действие е необратимо. Сигурни ли сте?')) {
            const encodedKey = encodeURIComponent(key);
            const form = document.querySelector(`form[action*="${encodedKey}"]`);
            if (form) {
                form.submit();
            } else {
                window.location.href = '/admin/translations/destroy/' + encodedKey;
            }
        }
    }
</script>
