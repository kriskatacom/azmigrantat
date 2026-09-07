<?php

use App\Core\View;
use App\Modules\Form;

$groupedElements = [];
foreach ($elements as $el) {
    $groupName = !empty($el->section_name) ? $el->section_name : 'Общи настройки';
    $groupedElements[$groupName][] = $el;
}
?>

<div class="fixed bottom-5 right-5 z-50">
    <?php Form::mainSubmit(); ?>
</div>

<div class="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
    <div>
        <a href="/admin/pages/edit/<?= $pageId ?>" class="text-slate-500 hover:text-primary text-sm mb-2 flex items-center gap-2 transition-colors">
            <i class="fa-solid fa-arrow-left"></i> Обратно към страницата
        </a>
        <h1 class="text-2xl font-semibold text-slate-900 leading-none">
            <?= $title ?>
        </h1>
        <p class="text-sm font-medium text-slate-500 mt-2 italic">
            Попълнете съдържанието на дефинираните за тази страница блокове.
        </p>
    </div>
    <div class="flex gap-3">
        <form action="/admin/pages/elements/import/<?= $pageId ?>" method="POST" enctype="multipart/form-data" id="import-form" class="hidden">
            <input type="file" name="json_file" accept=".json" onchange="document.getElementById('import-form').submit()">
        </form>

        <button type="button" onclick="document.querySelector('#import-form input').click()" class="bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl font-semibold shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2">
            <i class="fa-solid fa-file-import text-indigo-500"></i>
            <span class="hidden lg:inline">Импорт (JSON)</span>
        </button>

        <a href="/admin/pages/elements/create/<?= $pageId ?>"
            class="bg-white/90 backdrop-blur-sm border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-semibold shadow-xl shadow-slate-200/50 hover:bg-white hover:border-primary/30 transition-all flex items-center gap-2 group">
            <i class="fa-solid fa-plus text-primary group-hover:rotate-90 transition-transform"></i>
            <span class="hidden lg:inline">Нова дефиниция</span>
        </a>
    </div>
</div>

<?php View::component('flash-messages', 'admin/components'); ?>

<?php if (empty($groupedElements)): ?>
    <div class="text-center py-20 bg-white border-2 border-dashed border-slate-200 rounded-3xl">
        <i class="fa-solid fa-cubes text-slate-300 text-5xl mb-4"></i>
        <h3 class="text-slate-600 font-semibold text-lg">Няма дефинирани елементи</h3>
        <a href="/admin/pages/elements/create/<?= $pageId ?>" class="text-primary font-semibold hover:underline mt-4 block">Създайте първия елемент</a>
    </div>
<?php else: ?>
    <form data-main-form id="values-form" action="/admin/pages/elements/update/<?= $pageId ?>" method="POST" enctype="multipart/form-data">

        <div class="space-y-5 max-w-5xl pb-24">
            <input type="hidden" name="group_name" id="section-to-delete" value="">
            <?php foreach ($groupedElements as $groupName => $items): ?>

                <div class="relative group/section">
                    <?php ob_start(); ?>
                    <div class="flex items-center justify-between w-full">
                        <span class="font-bold text-slate-800">
                            <?= htmlspecialchars($groupName) ?>
                        </span>

                        <div class="absolute right-12 flex items-center gap-2">
                            <button type="submit"
                                formaction="/admin/pages/elements/delete-section/<?= $pageId ?>"
                                onclick="document.getElementById('section-to-delete').value = '<?= addslashes($groupName) ?>'; return confirm('ВНИМАНИЕ: Това ще изтрие ЦЯЛАТА секция \'<?= addslashes($groupName) ?>\'?')"
                                class="opacity-0 group-hover/section:opacity-100 w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 bg-white shadow-sm border border-slate-100 hover:bg-red-50 hover:text-red-500 transition-all"
                                title="Изтрий цялата секция">
                                <i class="fa-solid fa-trash-can text-xs"></i>
                            </button>
                        </div>
                    </div>
                    <?php $sectionTitle = ob_get_clean(); ?>

                    <?php Form::section($sectionTitle, function () use ($items, $values, $pageId) { ?>
                        <div class="space-y-5 divide-y divide-slate-100">
                            <?php foreach ($items as $el):
                                $currentValue = $values[$el->id] ?? '';
                            ?>

                                <div class="pt-5 first:pt-0 group/item">
                                    <div class="flex items-center justify-between mb-5 group/header">
                                        <div class="flex items-center gap-4">
                                            <div class="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover/item:bg-primary/10 group-hover/item:text-primary transition-colors duration-300 shadow-sm border border-slate-100">
                                                <?php $icon = match ($el->type) {
                                                    'text' => 'fa-font',
                                                    'textarea', 'editor' => 'fa-align-left',
                                                    'image' => 'fa-image',
                                                    default => 'fa-cube'
                                                }; ?>
                                                <i class="fa-solid <?= $icon ?> text-sm"></i>
                                            </div>

                                            <div>
                                                <div class="flex items-center gap-2 mb-0.5">
                                                    <h4 class="font-bold text-slate-900 tracking-tight">
                                                        <?= htmlspecialchars($el->label) ?>
                                                    </h4>
                                                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200/50">
                                                        <?= $el->type ?>
                                                    </span>
                                                </div>
                                                <?php if ($el->help_text): ?>
                                                    <p class="text-xs text-slate-400 flex items-center gap-1.5">
                                                        <i class="fa-solid fa-circle-info text-[10px] opacity-50"></i>
                                                        <?= htmlspecialchars($el->help_text) ?>
                                                    </p>
                                                <?php endif; ?>
                                            </div>
                                        </div>

                                        <div class="flex items-center gap-1">
                                            <a href="/admin/pages/elements/edit-definition/<?= $pageId ?>/<?= $el->id ?>"
                                                class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 bg-white shadow-sm border border-slate-100 hover:text-primary transition-all"
                                                title="Настройки">
                                                <i class="fa-solid fa-sliders text-xs"></i>
                                            </a>
                                            <button type="submit"
                                                formaction="/admin/pages/elements/delete/<?= $pageId ?>/<?= $el->id ?>"
                                                onclick="return confirm('Сигурни ли сте?')"
                                                class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 bg-white shadow-sm border border-slate-100 hover:bg-red-50 hover:text-red-500 transition-all">
                                                <i class="fa-solid fa-trash-can text-xs"></i>
                                            </button>
                                        </div>
                                    </div>

                                    <div class="bg-slate-50/30 rounded-2xl border border-slate-100/50">
                                        <?php switch ($el->type):
                                            case 'text':
                                                Form::input('', "elements[$el->id]", $currentValue);
                                                break;
                                            case 'textarea':
                                                Form::textarea('', "elements[$el->id]", $currentValue, ['rows' => 3]);
                                                break;
                                            case 'editor':
                                                View::component('form-editor', 'admin/partials', [
                                                    'name'  => "elements[$el->id]",
                                                    'label' => '',
                                                    'value' => $currentValue
                                                ]);
                                                break;
                                            case 'image':
                                                Form::image('', "elements[$el->id]", $currentValue);
                                                break;
                                        endswitch; ?>
                                    </div>

                                    <div class="mt-3 px-2 flex justify-between items-center">
                                        <div class="text-[10px] font-mono text-slate-300 italic">
                                            $page->get('<?= $el->key_name ?>')
                                        </div>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    <?php }, 'fa-layer-group', true); ?>
                </div>
            <?php endforeach; ?>
        </div>
    </form>
<?php endif; ?>