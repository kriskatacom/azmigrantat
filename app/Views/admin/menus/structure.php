<?php

use App\Modules\Form;
use App\Core\View;
?>

<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/nestable2/1.6.0/jquery.nestable.min.css">
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/nestable2/1.6.0/jquery.nestable.min.js"></script>

<style>
    body.dd-dragging {
        overflow: hidden !important;
    }

    .dd {
        max-width: 100%;
    }

    .dd-list {
        display: block;
        position: relative;
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .dd-list .dd-list {
        padding-left: 48px;
        margin-top: 12px;
        border-left: 3px solid #f1f5f9;
        margin-left: 24px;
    }

    .dd-item {
        display: block;
        position: relative;
        margin: 0;
        padding: 0;
        min-height: 20px;
    }

    .dd-item>button {
        display: none;
    }

    .dd-handle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 40px 20px;
        color: #1e293b;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 5px;
        cursor: grab;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
    }

    .dd-handle:hover {
        border-color: #3b82f6;
        transform: translateY(-2px);
        box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
    }

    .dd-handle:active {
        cursor: grabbing;
    }

    .dd-placeholder {
        margin: 12px 0;
        min-height: 84px;
        background: #f8fafc;
        border: 3px dashed #cbd5e1;
        border-radius: 24px;
    }

    #save-status {
        display: none;
        position: fixed;
        top: 2rem;
        right: 2rem;
        z-index: 10000;
        padding: 12px 24px;
        border-radius: 9999px;
        font-weight: 600;
        backdrop-filter: blur(8px);
        box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
        align-items: center;
        gap: 12px;
        transition: all 0.3s ease;
    }

    .nodrag,
    .nodrag * {
        cursor: pointer !important;
    }
</style>

<div id="save-status">
    <i class="fa-solid fa-circle-notch fa-spin"></i>
    <span>Запазване...</span>
</div>

<div id="editModal" class="fixed inset-0 z-10001 hidden overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen px-4">
        <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onclick="closeModal()"></div>

        <div class="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 transition-all transform">
            <div class="flex items-center justify-between mb-6">
                <h3 class="text-xl font-bold text-slate-900">Редактиране на елемент</h3>
                <button type="button" onclick="closeModal()" class="text-slate-400 hover:text-slate-600 transition-colors">
                    <i class="fa-solid fa-xmark text-xl"></i>
                </button>
            </div>

            <form action="/admin/menus/update-item" method="POST" class="space-y-5">
                <input type="hidden" id="edit_item_id" name="id">

                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-2">Име на линка</label>
                    <input type="text" id="edit_title" name="title"
                        class="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all">
                </div>

                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-2">Отваряне в</label>
                    <select id="edit_target" name="target"
                        class="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-primary transition-all">
                        <option value="_self">Същия прозорец</option>
                        <option value="_blank">Нов прозорец (Tab)</option>
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-2">Избери страница</label>
                    <select id="edit_page_id" name="page_id"
                        class="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-primary transition-all">
                        <option value="">-- Външен линк --</option>
                        <?php foreach ($pages as $id => $pTitle): ?>
                            <option value="<?= $id ?>"><?= htmlspecialchars($pTitle) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-semibold text-slate-700 mb-2">Външен URL адрес</label>
                    <input type="text" id="edit_url" name="url" placeholder="https://example.com"
                        class="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-primary transition-all">
                </div>

                <div class="grid grid-cols-2 gap-4 pt-4">
                    <button type="button" onclick="closeModal()"
                        class="px-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all text-center">
                        Отказ
                    </button>
                    <button type="submit"
                        class="px-6 py-3 rounded-xl bg-primary text-white font-bold hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center gap-2">
                        <i class="fa-solid fa-save"></i> Запази промените
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<div class="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
    <div>
        <a href="/admin/menus" class="text-slate-400 hover:text-primary text-sm mb-3 flex items-center gap-2 transition-colors w-fit font-medium">
            <i class="fa-solid fa-chevron-left text-[10px]"></i> Списък менюта
        </a>
        <h1 class="text-lg font-semibold text-slate-900">Структура: <?= htmlspecialchars($menu->title) ?></h1>
    </div>
</div>

<?php View::component('flash-messages', 'admin/components'); ?>

<div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
    <div class="lg:col-span-4">
        <div class="sticky top-8">
            <?php Form::section('Нов елемент', function () use ($pages, $menu) { ?>
                <form action="/admin/menus/add-item/<?= $menu->id ?>" method="POST" class="space-y-5">
                    <?php
                    Form::input('Име на линка', 'title', '', 'text', ['class' => 'text-lg py-3']);
                    Form::select('Избери страница', 'page_id', $pages);
                    Form::input('Външен URL адрес', 'url', '', 'text', ['placeholder' => 'https://example.com']);
                    Form::select('Отваряне в', 'target', ['_self' => 'Същия прозорец', '_blank' => 'Нов прозорец (Tab)']);
                    ?>
                    <div class="pt-4">
                        <?php Form::submit('Добавяне на елемента', 'fa-save'); ?>
                    </div>
                </form>
            <?php }, 'fa-plus-circle'); ?>
        </div>
    </div>

    <div class="lg:col-span-8">
        <div class="dd" id="nestable">
            <?php if ($items->isEmpty()): ?>
                <div class="bg-white rounded-md border-4 border-dashed border-slate-100 p-20 text-center">
                    <div class="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <i class="fa-solid fa-layer-group text-4xl text-slate-200"></i>
                    </div>
                    <h3 class="text-xl font-bold text-slate-400">Менюто е празно</h3>
                </div>
            <?php else: ?>
                <ol class="dd-list">
                    <?php foreach ($items as $item): ?>
                        <?= renderNode($item) ?>
                    <?php endforeach; ?>
                </ol>
            <?php endif; ?>
        </div>
    </div>
</div>

<?php
function renderNode($item)
{
    ob_start(); ?>
    <li class="dd-item" data-id="<?= $item->id ?>">
        <div class="dd-handle">
            <div class="flex items-center gap-6">
                <div class="dd-grip"><i class="fa-solid fa-grip-vertical text-lg"></i></div>
                <div>
                    <div class="text-lg font-semibold text-slate-800"><?= htmlspecialchars($item->title) ?></div>
                    <div class="flex items-center gap-3 mt-1">
                        <span class="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            <?= $item->page_id ? 'Страница' : 'Линк' ?>
                        </span>
                        <span class="text-xs text-slate-300 font-mono italic">
                            <?= $item->page_id ? 'ID: ' . $item->page_id : $item->url ?>
                        </span>
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-2 nodrag">
                <button type="button"
                    onclick='openEditModal(<?= json_encode(["id" => $item->id, "title" => $item->title, "page_id" => $item->page_id, "url" => $item->url, "target" => $item->target]) ?>)'
                    class="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all">
                    <i class="fa-solid fa-pen-to-square text-lg"></i>
                </button>
                <form action="/admin/menus/delete-item/<?= $item->id ?>" method="POST" class="inline" onsubmit="return confirm('Изтриване?')">
                    <button type="submit" class="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all">
                        <i class="fa-solid fa-trash-can text-lg"></i>
                    </button>
                </form>
            </div>
        </div>
        <?php if ($item->children && $item->children->count() > 0): ?>
            <ol class="dd-list">
                <?php foreach ($item->children as $child): ?>
                    <?= renderNode($child) ?>
                <?php endforeach; ?>
            </ol>
        <?php endif; ?>
    </li>
<?php return ob_get_clean();
}
?>

<script>
    function openEditModal(data) {
        $('#edit_item_id').val(data.id);
        $('#edit_title').val(data.title);
        $('#edit_target').val(data.target || "_self");
        $('#edit_page_id').val(data.page_id || "");
        $('#edit_url').val(data.url || "");
        $('#editModal').removeClass('hidden').show();
        $('body').css('overflow', 'hidden');
    }

    function closeModal() {
        $('#editModal').hide().addClass('hidden');
        $('body').css('overflow', '');
    }

    $(document).ready(function() {
        <?php if (isset($editItem) && $editItem): ?>
            openEditModal(<?= json_encode([
                                'id' => $editItem->id,
                                'title' => $editItem->title,
                                'page_id' => $editItem->page_id,
                                'url' => $editItem->url,
                                'target' => $editItem->target
                            ]) ?>);
        <?php endif; ?>

        $('#nestable').nestable({
            maxDepth: 5,
            threshold: 25,
            handleClass: 'dd-grip',
            callback: function(l) {
                $('body').removeClass('dd-dragging');
                saveHierarchy($(l).nestable('serialize'));
            }
        });

        $(document).on('mousedown', '.dd-grip', function() {
            $('body').addClass('dd-dragging');
        });
        $(document).on('mouseup', function() {
            $('body').removeClass('dd-dragging');
        });

        function saveHierarchy(data) {
            const $status = $('#save-status');

            $.ajax({
                url: '/admin/menus/reorder-items',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    items: data
                }),
                success: function(res) {
                    if (res.success) {
                        $status.find('span').text('Успешно запазено');
                        setTimeout(() => $status.fadeOut(400), 2000);
                    }
                }
            });
        }
    });
</script>