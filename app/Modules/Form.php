<?php

namespace App\Modules;

class Form
{
    public static function section(string $title, callable $callback, string $icon = '', bool $defaultOpen = true, string $id = '')
    {
        $sectionKey = 'section_' . md5($title);
        $isOpen = isset($_SESSION['ui_states'][$sectionKey]) ? $_SESSION['ui_states'][$sectionKey] : $defaultOpen;
?>
        <details class="group bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-5"
            data-section-key="<?= $sectionKey ?>"
            id="<?= $id ?>"
            <?= $isOpen ? 'open' : '' ?>>

            <summary class="list-none cursor-pointer font-semibold text-xl text-slate-900 border-b border-slate-100 flex items-center justify-between p-5 bg-slate-50/30 hover:bg-slate-50 transition-colors">
                <div class="flex items-center gap-2">
                    <?php if ($icon): ?>
                        <i class="fa-solid <?= $icon ?> text-slate-400"></i>
                    <?php endif; ?>
                    <?= $title ?>
                </div>
                <i class="fa-solid fa-chevron-down text-sm text-slate-400 transition-transform duration-300 group-open:rotate-180"></i>
            </summary>

            <div class="p-5 space-y-5 border-t border-slate-50">
                <?php $callback(); ?>
            </div>
        </details>

        <script>
            document.addEventListener('DOMContentLoaded', function() {
                document.querySelectorAll('details[data-section-key]').forEach(section => {
                    section.addEventListener('toggle', function() {
                        const key = this.getAttribute('data-section-key');
                        const isOpen = this.open;

                        fetch('/admin/ui/save-state', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                            },
                            body: `key=${key}&open=${isOpen}`
                        });
                    });
                });
            });
        </script>
    <?php
    }

    public static function input(string $label, string $name, string $value = '', string $type = 'text', array $options = [])
    {
        $required = ($options['required'] ?? false) ? 'required' : '';
        $placeholder = $options['placeholder'] ?? '';
        $help = $options['help'] ?? '';
        $wrapperId = $options['wrapper_id'] ?? '';
        $id = $options['id'] ?? '';
    ?>
        <div <?= $wrapperId ? "id=\"$wrapperId\"" : "" ?> id="<?= $id ?>">
            <label class="block text-sm font-medium text-slate-700 mb-1"><?= $label ?></label>
            <input type="<?= $type ?>"
                name="<?= $name ?>"
                value="<?= htmlspecialchars($value) ?>"
                <?= $required ?>
                placeholder="<?= $placeholder ?>"
                class="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all">
            <?php if ($help): ?>
                <p class="text-xs text-slate-400 mt-1"><?= $help ?></p>
            <?php endif; ?>
        </div>
    <?php
    }

    public static function textarea(string $label, string $name, string $value = '', array $options = [])
    {
        $required = ($options['required'] ?? false) ? 'required' : '';
        $placeholder = $options['placeholder'] ?? '';
        $help = $options['help'] ?? '';
        $rows = $options['rows'] ?? 4;
        $id = $options['id'] ?? 'id_' . md5($name);
        $wrapperId = $options['wrapper_id'] ?? '';
    ?>
        <div <?= $wrapperId ? "id=\"$wrapperId\"" : "" ?> class="w-full">
            <label for="<?= $id ?>" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                <?= $label ?>
            </label>

            <textarea
                id="<?= $id ?>"
                name="<?= $name ?>"
                rows="<?= $rows ?>"
                <?= $required ?>
                placeholder="<?= $placeholder ?>"
                class="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-y min-h-25 dark:text-slate-200"><?= htmlspecialchars($value) ?></textarea>

            <?php if ($help): ?>
                <p class="text-xs text-slate-400 mt-1 ml-1 italic"><?= $help ?></p>
            <?php endif; ?>
        </div>
    <?php
    }

    public static function select(string $label, string $name, array $choices, $selectedValue = '', array $options = [])
    {
        $id = $options['id'] ?? '';
    ?>
        <div>
            <label class="block text-sm font-medium text-slate-700 mb-1"><?= $label ?></label>
            <select name="<?= $name ?>" <?= $id ? "id=\"$id\"" : "" ?> class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer">
                <?php foreach ($choices as $val => $text): ?>
                    <option value="<?= $val ?>" <?= (string)$val === (string)$selectedValue ? 'selected' : '' ?>><?= $text ?></option>
                <?php endforeach; ?>
            </select>
        </div>
    <?php
    }

    public static function getTreeOptions(string $modelClass, array $excludeIds = [], string $titleField = 'name', string $emptyLabel = 'Без родител'): array
    {
        $options = ['' => $emptyLabel];

        $build = function ($parentId = null, $level = 0) use (&$options, &$build, $modelClass, $excludeIds, $titleField) {
            $query = $modelClass::where('parent_id', $parentId);

            if (!empty($excludeIds)) {
                $query->whereNotIn('id', $excludeIds);
            }

            $items = $query->orderBy('menu_order', 'asc')->get();

            foreach ($items as $item) {
                $prefix = $level > 0 ? str_repeat('— ', $level) : '';
                $options[$item->id] = $prefix . $item->{$titleField};

                $build($item->id, $level + 1);
            }
        };

        $build(null);
        return $options;
    }

    public static function toggle(string $label, string $name, bool $checked = false, array $options = [])
    {
        $help = $options['help'] ?? '';
    ?>
        <div class="space-y-1 py-2">
            <div class="flex items-center gap-3">
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name="<?= $name ?>" value="1" class="sr-only peer" <?= $checked ? 'checked' : '' ?>>
                    <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer 
                            peer-checked:after:translate-x-full peer-checked:after:border-white 
                            after:content-[''] after:absolute after:top-0.5 after:left-0.5 
                            after:bg-white after:border-gray-300 after:border after:rounded-full 
                            after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
                <span class="text-sm font-medium text-slate-700"><?= $label ?></span>
            </div>
            <?php if ($help): ?>
                <p class="text-xs text-slate-400 italic"><?= $help ?></p>
            <?php endif; ?>
        </div>
    <?php
    }

    public static function image(string $label, string $name, ?string $currentValue = null, array $options = [])
    {
        static $jsRendered = false;

        $id = $options['id'] ?? 'img-' . bin2hex(random_bytes(4));
        $default = $options['default'] ?? '/assets/images/no-image.png';

        $hasImage = !empty($currentValue) && file_exists(PUBLIC_PATH . $currentValue);
        $fullPath = $hasImage ? $currentValue : $default;
    ?>
        <div class="space-y-3 image-upload-container" data-component="image-upload">
            <label class="text-sm font-semibold text-gray-700 block"><?= $label ?></label>

            <div class="flex flex-col sm:flex-row items-center gap-5 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200 transition-colors hover:bg-gray-50/80">
                <div class="relative shrink-0 group/img">
                    <div class="relative w-44 h-32 rounded-2xl overflow-hidden shadow-sm border-2 border-white bg-white transition-all duration-300 group-hover/img:shadow-xl group-hover/img:-translate-y-1">
                        <img id="preview-<?= $id ?>" src="<?= $fullPath ?>" data-default="<?= $default ?>" class="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110">
                        <div id="overlay-<?= $id ?>" class="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 <?= !$hasImage ? 'hidden' : '' ?>"></div>
                        <div id="actions-<?= $id ?>" class="absolute top-2 right-2 flex gap-1.5 translate-y-2.5 opacity-0 group-hover/img:translate-y-0 group-hover/img:opacity-100 transition-all duration-300 z-10 <?= !$hasImage ? 'hidden' : '' ?>">
                            <button type="button" id="zoom-btn-<?= $id ?>" data-src="<?= $fullPath ?>" class="lightbox-trigger remove-image-btn w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur-sm text-orange-500 rounded-md shadow-md hover:bg-orange-500 hover:text-white transition-all duration-200" title="Преглед на голям екран">
                                <i class="fa-solid fa-magnifying-glass"></i>
                            </button>

                            <a id="download-btn-<?= $id ?>" href="<?= $fullPath ?>" download class="w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur-sm text-blue-500 rounded-md shadow-md hover:bg-blue-500 hover:text-white transition-all duration-200" title="Сваляне на изображението">
                                <i class="fa-solid fa-download"></i>
                            </a>

                            <button type="button" class="remove-image-btn w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur-sm text-red-500 rounded-md shadow-md hover:bg-red-500 hover:text-white transition-all duration-200" title="Премахване на изображението">
                                <i class="fa-solid fa-times"></i>
                            </button>
                        </div>
                        <div class="text-xs text-gray-700">
                            При всяка промяна трябва да натиснете бутона за запазване на промените.
                        </div>
                    </div>
                    <input type="hidden" name="remove_<?= $name ?>" id="remove-input-<?= $id ?>" value="0">
                </div>

                <div class="flex flex-col gap-3 flex-1">
                    <label class="cursor-pointer group w-fit" title="<?= $hasImage ? 'Промяна на изображение' : 'Качване на изображение' ?>">
                        <input type="file" name="<?= $name ?>" id="<?= $id ?>" accept="image/*" class="hidden image-file-input">
                        <div class="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm text-sm font-bold text-gray-700 group-hover:border-indigo-400 group-hover:text-indigo-600 transition-all duration-300">
                            <i class="fa-solid fa-plus"></i>
                            <span class="btn-text"><?= $hasImage ? 'Промяна' : 'Качване' ?></span>
                        </div>
                    </label>
                    <div class="font-semibold text-xs text-gray-600">JPG, PNG, WebP (Макс. 10MB)</div>
                </div>
            </div>
        </div>

        <?php if (!$jsRendered): $jsRendered = true; ?>
            <script>
                document.addEventListener('DOMContentLoaded', function() {
                    document.body.addEventListener('change', function(e) {
                        if (e.target.classList.contains('image-file-input')) {
                            const input = e.target;
                            const container = input.closest('[data-component="image-upload"]');
                            const preview = container.querySelector('img[id^="preview-"]');
                            const actions = container.querySelector('div[id^="actions-"]');
                            const overlay = container.querySelector('div[id^="overlay-"]');
                            const removeInput = container.querySelector('input[type="hidden"]');
                            const btnText = container.querySelector('.btn-text');

                            if (input.files && input.files[0]) {
                                const reader = new FileReader();
                                reader.onload = function(event) {
                                    const src = event.target.result;
                                    preview.src = src;

                                    const zoomBtn = container.querySelector('.lightbox-trigger');
                                    if (zoomBtn) {
                                        zoomBtn.setAttribute('data-src', src);
                                    }

                                    actions.classList.remove('hidden');
                                    overlay.classList.remove('hidden');
                                    removeInput.value = "0";
                                    btnText.textContent = "Смени снимката";
                                };
                                reader.readAsDataURL(input.files[0]);
                            }
                        }
                    });

                    document.body.addEventListener('click', function(e) {
                        const removeBtn = e.target.closest('.remove-image-btn');
                        if (removeBtn) {
                            const container = removeBtn.closest('[data-component="image-upload"]');
                            const input = container.querySelector('.image-file-input');
                            const preview = container.querySelector('img[id^="preview-"]');
                            const actions = container.querySelector('div[id^="actions-"]');
                            const overlay = container.querySelector('div[id^="overlay-"]');
                            const removeInput = container.querySelector('input[type="hidden"]');
                            const btnText = container.querySelector('.btn-text');

                            preview.src = preview.dataset.default;
                            input.value = "";
                            removeInput.value = "1";
                            actions.classList.add('hidden');
                            overlay.classList.add('hidden');
                            btnText.textContent = "Качи снимка";
                        }
                    });
                });
            </script>
        <?php endif; ?>
    <?php
    }

    public static function multiImage(string $label, string $name, array $currentImages = [])
    {
        $id = 'multi-upload-' . bin2hex(random_bytes(4));
        ?>
        <div class="space-y-3" data-component="multi-image-upload" id="<?= $id ?>">
            <label class="text-sm font-semibold text-slate-700 block"><?= $label ?></label>
            
            <div class="drop-zone flex flex-col items-center justify-center p-8 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 transition-all hover:bg-slate-50/80 hover:border-primary/50 cursor-pointer relative group">
                <input type="file" multiple accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer file-input">
                <div class="text-center pointer-events-none">
                    <i class="fa-solid fa-cloud-arrow-up text-3xl text-slate-400 mb-2 group-hover:text-primary transition-colors"></i>
                    <div class="font-bold text-sm text-slate-700">Влачете изображения тук или <span class="text-primary hover:underline">кликнете за избор</span></div>
                    <div class="text-xs text-slate-400 mt-1">Поддържат се всички графични формати през StorageService</div>
                </div>
            </div>

            <div class="previews-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 2xl:grid-cols-5 gap-4 mt-4">
                <?php foreach ($currentImages as $path): ?>
                    <div class="relative group aspect-video rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-white image-item" data-path="<?= htmlspecialchars($path) ?>">
                        <img src="<?= htmlspecialchars($path) ?>" class="w-full h-full object-cover">
                        <input type="hidden" name="<?= $name ?>[]" value="<?= htmlspecialchars($path) ?>">
                        
                        <div class="absolute inset-0 bg-black/40 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 pointer-events-none lg:pointer-events-auto"></div>
                        
                        <div class="absolute top-2 right-2 z-10 flex gap-1.5 p-1 rounded-lg bg-black/20 lg:bg-transparent backdrop-blur-sm lg:backdrop-blur-none">
                            <button type="button" class="btn-view-img w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-white text-slate-700 rounded-md shadow-md hover:bg-primary hover:text-white transition-all transform hover:scale-110" title="Преглед на голям екран">
                                <i class="fa-solid fa-eye text-xs sm:text-sm"></i>
                            </button>
                            <button type="button" class="btn-delete-img w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-white text-red-500 rounded-md shadow-md hover:bg-red-500 hover:text-white transition-all transform hover:scale-110" title="Премахване">
                                <i class="fa-solid fa-trash-can text-xs sm:text-sm"></i>
                            </button>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>

            <div class="lightbox-modal fixed inset-0 z-100 hidden bg-black/80 backdrop-blur-sm items-center justify-center p-4 opacity-0 transition-opacity duration-200">
                <button type="button" class="lightbox-close absolute top-5 right-5 text-white/70 hover:text-white text-3xl p-2 transition-colors cursor-pointer" title="Затваряне (Esc)">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                <div class="max-w-5xl max-h-[85vh] relative flex items-center justify-center pointer-events-none">
                    <img class="lightbox-img max-w-full max-h-[85vh] rounded-lg shadow-2xl border border-white/10 object-contain pointer-events-auto" src="" alt="Преглед">
                </div>
            </div>
        </div>

        <script>
        document.addEventListener('DOMContentLoaded', function() {
            const container = document.getElementById('<?= $id ?>');
            if (!container) return;

            const fileInput = container.querySelector('.file-input');
            const dropZone = container.querySelector('.drop-zone');
            const grid = container.querySelector('.previews-grid');
            const lightbox = container.querySelector('.lightbox-modal');
            const lightboxImg = lightbox.querySelector('.lightbox-img');
            const lightboxClose = lightbox.querySelector('.lightbox-close');
            const inputName = '<?= $name ?>[]';

            ['dragenter', 'dragover'].forEach(eventName => {
                dropZone.addEventListener(eventName, (e) => { e.preventDefault(); dropZone.classList.add('border-primary', 'bg-primary/5'); });
            });
            ['dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, (e) => { e.preventDefault(); dropZone.classList.remove('border-primary', 'bg-primary/5'); });
            });

            dropZone.addEventListener('drop', (e) => { handleFiles(e.dataTransfer.files); });
            fileInput.addEventListener('change', (e) => { handleFiles(e.target.files); });

            function handleFiles(files) {
                [...files].forEach(uploadFileToServer);
            }

            function uploadFileToServer(file) {
                const tempId = 'temp-' + Math.random().toString(36).substr(2, 9);
                const loaderHtml = `
                    <div id="${tempId}" class="relative aspect-video rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-slate-50 flex flex-col items-center justify-center p-2">
                        <i class="fa-solid fa-circle-notch fa-spin text-primary text-lg mb-1"></i>
                        <div class="text-[10px] text-slate-400 truncate max-w-full px-1">${file.name}</div>
                    </div>
                `;
                grid.insertAdjacentHTML('beforeend', loaderHtml);
                const tempItem = document.getElementById(tempId);

                const formData = new FormData();
                formData.append('file', file);

                fetch('/admin/storage/ajax-upload', {
                    method: 'POST',
                    body: formData
                })
                .then(res => res.json())
                .then(data => {
                    if (data.url) { 
                        tempItem.outerHTML = `
                            <div class="relative group aspect-video rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-white image-item" data-path="${data.url}">
                                <img src="${data.url}" class="w-full h-full object-cover">
                                <input type="hidden" name="${inputName}" value="${data.url}">
                                <div class="absolute inset-0 bg-black/40 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 pointer-events-none lg:pointer-events-auto"></div>
                                <div class="absolute top-2 right-2 z-10 flex gap-1.5 p-1 rounded-lg bg-black/20 lg:bg-transparent backdrop-blur-sm lg:backdrop-blur-none">
                                    <button type="button" class="btn-view-img w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-white text-slate-700 rounded-md shadow-md hover:bg-primary hover:text-white transition-all transform hover:scale-110" title="Преглед на голям екран">
                                        <i class="fa-solid fa-eye text-xs sm:text-sm"></i>
                                    </button>
                                    <button type="button" class="btn-delete-img w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-white text-red-500 rounded-md shadow-md hover:bg-red-500 hover:text-white transition-all transform hover:scale-110" title="Премахване">
                                        <i class="fa-solid fa-trash-can text-xs sm:text-sm"></i>
                                    </button>
                                </div>
                            </div>
                        `;
                    } else {
                        alert('Грешка при качване: ' + (data.error || 'Неизвестна грешка'));
                        tempItem.remove();
                    }
                })
                .catch(err => {
                    console.error(err);
                    tempItem.remove();
                });
            }

            grid.addEventListener('click', function(e) {
                const viewBtn = e.target.closest('.btn-view-img');
                if (viewBtn) {
                    const item = viewBtn.closest('.image-item');
                    const path = item.getAttribute('data-path');
                    if (path) {
                        openLightbox(path);
                    }
                    return;
                }

                const deleteBtn = e.target.closest('.btn-delete-img');
                if (!deleteBtn) return;

                const item = deleteBtn.closest('.image-item');
                const path = item.getAttribute('data-path');

                if (confirm('Сигурни ли сте, че искате да премахнете това изображение?')) {
                    deleteBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-xs"></i>';
                    deleteBtn.disabled = true;

                    fetch('/admin/storage/ajax-delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ path: path })
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            item.remove();
                        } else {
                            alert('Грешка при премахване: ' + data.error);
                            deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can text-sm"></i>';
                            deleteBtn.disabled = false;
                        }
                    })
                    .catch(err => {
                        console.error(err);
                        deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can text-sm"></i>';
                        deleteBtn.disabled = false;
                    });
                }
            });

            function openLightbox(src) {
                lightboxImg.src = src;
                lightbox.classList.remove('hidden');
                lightbox.classList.add('flex');
                setTimeout(() => lightbox.classList.remove('opacity-0'), 10);
                document.body.style.overflow = 'hidden';
            }

            function closeLightbox() {
                lightbox.classList.add('opacity-0');
                setTimeout(() => {
                    lightbox.classList.remove('flex');
                    lightbox.classList.add('hidden');
                    lightboxImg.src = '';
                }, 200);
                document.body.style.overflow = '';
            }

            lightboxClose.addEventListener('click', closeLightbox);

            lightbox.addEventListener('click', function(e) {
                if (e.target === lightbox) {
                    closeLightbox();
                }
            });

            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && !lightbox.classList.contains('hidden')) {
                    closeLightbox();
                }
            });
        });
        </script>
        <?php
    }

    public static function submit(string $text = 'Запазване на промените', string $icon = 'fa-save')
    {
    ?>
        <button type="submit"
            class="js-admin-submit-btn group relative flex items-center justify-center bg-primary text-white py-2 px-5 rounded-lg font-semibold shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all transform active:scale-[0.98] disabled:opacity-80">
            <i class="js-btn-icon fa-solid <?= $icon ?> mr-2"></i>
            <i class="js-btn-spinner fa-solid fa-circle-notch fa-spin mr-2" style="display: none;"></i>
            <span class="js-btn-text"><?= $text ?></span>
        </button>
    <?php
    }

    public static function mainSubmit($label = 'Запазване', $icon = 'fa-floppy-disk')
    {
        ob_start(); ?>

        <button type="button"
            data-role="main-submit-btn"
            class="group relative flex items-center justify-center bg-primary text-white py-2 px-5 rounded-lg font-semibold shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all transform active:scale-[0.98] disabled:opacity-80">
            <i class="fa-solid <?= $icon ?>"></i>
            <span class="px-2"><?= $label ?></span>
            <span class="opacity-40 hidden sm:inline px-1.5 py-0.5 border border-white/20 rounded-md">Ctrl+S</span>
        </button>

        <script>
            (function() {
                const getMainForm = () => document.querySelector('form[data-main-form]');

                const handleSave = (e) => {
                    const form = getMainForm();
                    if (!form) return;

                    if (form.reportValidity()) {
                        const btn = document.querySelector('[data-role="main-submit-btn"]');
                        if (btn) btn.innerHTML = '<i class="fa-solid fa-circle-notch animate-spin"></i> Обработка...';

                        form.submit();
                    }
                };

                document.addEventListener('click', function(e) {
                    if (e.target.closest('[data-role="main-submit-btn"]')) {
                        handleSave();
                    }
                });

                document.addEventListener('keydown', function(e) {
                    if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyS' || e.key.toLowerCase() === 's' || e.key.toLowerCase() === 'я')) {
                        e.preventDefault();
                        handleSave();
                    }
                });
            })();
        </script>

<?php
        echo ob_get_clean();
    }
}