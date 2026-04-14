<?php

use App\Modules\Form;
use App\Core\View;
use App\Core\App;

$isEdit = $translation->exists;

// Динамично извличане на всички езици от ядрото
$allLangs = array_merge([App::$defaultLang], App::$supportedLangs);
?>

<div class="fixed bottom-5 right-5 z-50">
    <?php Form::mainSubmit(); ?>
</div>

<div class="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
    <div>
        <a href="/admin/translations" class="text-slate-500 hover:text-primary text-sm mb-2 flex items-center gap-2 transition-colors w-fit">
            <i class="fa-solid fa-arrow-left"></i> Назад към списъка
        </a>
        <h1 class="text-2xl font-bold text-slate-900"><?= $title ?></h1>
    </div>
</div>

<?php View::component('flash-messages', 'admin/components'); ?>

<form data-main-form action="<?= $isEdit ? "/admin/translations/update/{$translation->id}" : "/admin/translations/store"; ?>" method="POST" class="grid grid-cols-1 lg:grid-cols-3 gap-6">

    <div class="lg:col-span-2 space-y-6">
        <?php Form::section('Стойности на превода', function () use ($translation, $allLangs) { ?>
            <div class="space-y-6">
                <?php foreach ($allLangs as $code):
                    $langName = App::$langNames[$code] ?? strtoupper($code);
                    $isDefault = ($code === App::$defaultLang);
                    $wrapperId = "lang-section-" . $code;
                ?>
                    <div id="<?= $wrapperId ?>" class="p-5 rounded-2xl bg-slate-50 border border-slate-100 transition-all hover:border-slate-200 hover:shadow-sm">
                        <div class="flex items-center justify-between mb-4">
                            <div class="flex items-center gap-2">
                                <span class="w-8 h-6 flex items-center justify-center bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-500 uppercase">
                                    <?= $code ?>
                                </span>
                                <span class="text-sm font-bold text-slate-700"><?= $langName ?></span>
                            </div>
                            <?php if ($isDefault): ?>
                                <span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 uppercase tracking-wider">Основен</span>
                            <?php endif; ?>
                        </div>

                        <?php
                        // Стойност за конкретния език
                        $val = $translation->getTranslationValue($code) ?? '';

                        Form::textarea($isDefault ? 'Текст на превода' : '', "translations[$code]", $val, [
                            'id' => "input-{$code}",
                            'required' => $isDefault,
                            'placeholder' => "Въведете превод на " . mb_strtolower($langName) . "...",
                            'rows' => 3,
                            'help' => !$isDefault ? "Оставете празно, ако няма превод за този език." : ""
                        ]);
                        ?>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php }, 'fa-language'); ?>
    </div>

    <div class="lg:col-span-1 space-y-6">
        <?php Form::section('Системни настройки', function () use ($translation, $isEdit) { ?>
            <div class="space-y-4">
                <?php
                Form::input('Системен ключ', 'translation_key', $translation->translation_key ?? '', 'text', [
                    'required' => true,
                    'placeholder' => 'global.buttons.save',
                    'readonly' => $isEdit,
                    'help' => 'Уникален идентификатор за превода.'
                ]);

                Form::input('Група (Namespace)', 'group', $translation->group ?? 'messages', 'text', [
                    'placeholder' => 'frontend, admin, emails...',
                    'help' => 'Напр. "admin" за системни преводи.'
                ]);
                ?>
            </div>
        <?php }, 'fa-key'); ?>

        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 class="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <i class="fa-solid fa-circle-info text-primary"></i>
                Инструкции
            </h3>
            <ul class="text-xs text-slate-600 space-y-3 leading-relaxed">
                <li class="flex gap-2">
                    <span class="text-primary font-bold">•</span>
                    Използвайте <code>{name}</code> за динамични параметри.
                </li>
                <li class="flex gap-2">
                    <span class="text-primary font-bold">•</span>
                    Ключовете трябва да са с малки букви и точки (напр. <code>auth.login.title</code>).
                </li>
            </ul>
        </div>

        <?php if ($isEdit): ?>
            <div class="bg-amber-50 border border-amber-200 p-5 rounded-2xl">
                <div class="flex gap-3">
                    <i class="fa-solid fa-triangle-exclamation text-amber-500 mt-1 text-lg"></i>
                    <div>
                        <h4 class="text-sm font-bold text-amber-900 mb-1">Внимание!</h4>
                        <p class="text-xs text-amber-800 leading-relaxed">
                            Промяната на <strong>Системния ключ</strong> може да счупи визуализацията на сайта, ако кодът не бъде актуализиран едновременно.
                        </p>
                    </div>
                </div>
            </div>
        <?php endif; ?>
    </div>
</form>
