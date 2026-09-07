<?php

use App\Modules\Form;
use App\Core\View;

$isEdit = isset($element) && $element->id;
$action = $isEdit
    ? "/admin/pages/elements/update-definition/{$pageId}/{$element->id}"
    : "/admin/pages/elements/store/{$pageId}";
?>

<div class="fixed bottom-5 right-5 z-50">
    <?php Form::mainSubmit(); ?>
</div>

<div class="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
    <div>
        <a href="/admin/pages/elements/<?= $pageId ?>" class="text-slate-500 hover:text-primary text-sm mb-2 flex items-center gap-2 transition-colors w-fit">
            <i class="fa-solid fa-arrow-left"></i> Назад към елементите
        </a>
        <h1 class="text-2xl font-bold text-slate-900"><?= $title ?></h1>
        <p class="text-slate-500 text-sm">Настройте техническите параметри на елемента за тази страница.</p>
    </div>
</div>

<?php View::component('flash-messages', 'admin/components'); ?>

<form data-main-form action="<?= $action ?>" method="POST" class="grid xl:grid-cols-3 gap-5">

    <div class="xl:col-span-2 space-y-5">
        <?php Form::section('Основни параметри', function () use ($element, $isEdit) { ?>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <?php
                Form::input('Етикет (Label)', 'label', $element->label ?? '', 'text', [
                    'required' => true,
                    'placeholder' => 'напр. Заглавие на секцията'
                ]);

                Form::input('Ключ (Key Name)', 'key_name', $element->key_name ?? '', 'text', [
                    'required' => true,
                    'placeholder' => 'напр. hero_title',
                    'help' => 'Използва се в кода за извикване',
                    'readonly' => $isEdit
                ]);
                ?>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                <?php
                Form::input('Име на секция / Група', 'section_name', $element->section_name ?? 'Общи', 'text', [
                    'placeholder' => 'напр. Начален екран'
                ]);

                Form::input('Подредба (Sort Order)', 'sort_order', $element->sort_order ?? 0, 'number');
                ?>
            </div>

            <div class="pt-2 mt-5">
                <?php Form::textarea('Помощен текст / Инструкция', 'help_text', $element->help_text ?? '', [
                    'placeholder' => 'Инструкции към редактора за това как да попълни това поле...',
                    'rows' => 3
                ]); ?>
            </div>
        <?php }, 'fa-tag'); ?>
    </div>

    <div class="xl:col-span-1 space-y-6">
        <?php Form::section('Тип на съдържанието', function () use ($element) { ?>
            <div class="space-y-4">
                <?php
                Form::select('Вид на полето', 'type', [
                    'text'      => 'Кратък текст (Input)',
                    'textarea'  => 'Дълъг текст (Textarea)',
                    'editor'    => 'Визуален редактор (Rich Text)',
                    'image'     => 'Изображение',
                    'gallery'   => 'Галерия'
                ], $element->type ?? 'text');
                ?>

                <div>
                    <?php Form::toggle('Елементът е активен', 'is_active', (bool)($element->is_active ?? true)); ?>
                </div>

                <div class="p-4 bg-blue-50 border border-blue-100 rounded-xl mt-4">
                    <div class="flex gap-3">
                        <i class="fa-solid fa-circle-info text-blue-400 mt-1"></i>
                        <p class="text-[11px] text-blue-700 leading-relaxed">
                            Типът определя какъв контрол ще вижда администраторът при редактиране на съдържанието на страницата.
                        </p>
                    </div>
                </div>
            </div>
        <?php }, 'fa-layer-group'); ?>

        <?php if (!$isEdit): ?>
            <?php Form::section('Бърз импорт (JSON)', function () { ?>
                <div class="space-y-4">
                    <p class="text-[11px] text-slate-500 leading-relaxed">
                        Имате готов шаблон? Качете вашия <span class="font-bold text-slate-700">.json</span> файл и системата ще генерира дефинициите автоматично за тази страница.
                    </p>

                    <div class="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl group/import hover:bg-indigo-100/50 transition-colors cursor-pointer"
                        onclick="document.getElementById('json-upload-input').click()">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-500 group-hover/import:scale-110 transition-transform">
                                <i class="fa-solid fa-file-import"></i>
                            </div>
                            <div>
                                <span class="block text-xs font-bold text-indigo-900">Избери файл</span>
                                <span class="block text-[10px] text-indigo-400 font-medium uppercase tracking-tighter">JSON Structure</span>
                            </div>
                        </div>
                    </div>

                    <div class="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                        <p class="text-[10px] text-amber-700 leading-tight">
                            <i class="fa-solid fa-triangle-exclamation mr-1"></i>
                            Внимавайте! Импортирането ще добави нови дефиниции към текущите.
                        </p>
                    </div>
                </div>
            <?php }, 'fa-file-code'); ?>
        <?php endif; ?>
    </div>
</form>

<?php if (!$isEdit): ?>
    <form id="import-json-form" action="/admin/pages/elements/import/<?= $pageId ?>" method="POST" enctype="multipart/form-data" class="hidden">
        <input type="file" name="json_file" id="json-upload-input" accept=".json" onchange="handleJsonUpload(this)" style="display: none;">
    </form>

    <script>
        function handleJsonUpload(input) {
            if (input.files && input.files[0]) {
                if (confirm('Сигурни ли сте, че искате да импортирате елементите от този файл?')) {
                    document.getElementById('import-json-form').submit();
                } else {
                    input.value = '';
                }
            }
        }
    </script>
<?php endif; ?>
