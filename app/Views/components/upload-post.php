<?php

use App\Core\View;
?>

<div id="custom-modal"
    class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm hidden items-center justify-center p-4">

    <div id="modal-box"
        class="bg-white w-full max-w-lg rounded-xl shadow-2xl transform transition-all scale-95 opacity-0 flex flex-col">

        <div class="flex items-center justify-between p-4 border-b border-gray-200">
            <div class="flex items-center gap-3">
                <h3 class="text-xl font-semibold text-gray-800">
                    <?= $title ?? 'Заглавие' ?>
                </h3>
                <span id="draft-indicator" class="hidden px-2 py-0.5 text-[10px] font-bold uppercase bg-amber-100 text-amber-700 rounded-full border border-amber-200">
                    Налична чернова
                </span>
            </div>
            <button onclick="PostModal.close()" class="text-gray-400 hover:text-gray-600 transition-colors">
                <i class="fas fa-times text-2xl"></i>
            </button>
        </div>

        <form action="<?= $submit_url ?? '#' ?>" method="POST" class="flex flex-col">
            <div class="p-5 min-h-25 flex flex-col">
                <div id="rich-editor-container">
                    <?php View::component('form-editor', 'admin/partials', [
                        'name'  => 'options[description]',
                        'label' => 'Описание на услугата',
                        'value' => $service->options['description'] ?? ''
                    ]); ?>
                </div>

                <div id="raw-editor-container" class="hidden">
                    <label class="block text-sm font-medium text-slate-700 mb-1">HTML Описание</label>
                    <textarea id="raw-editor" class="w-full h-75 p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Въведете съдържание тук..."></textarea>
                </div>

                <div id="fb-editor-container" class="hidden">
                    <div class="flex flex-col items-center">
                        <div id="fb-preview" class="w-full aspect-video rounded-xl flex items-center justify-center p-8 transition-all duration-500 shadow-inner bg-cover bg-center" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                            <textarea id="fb-text"
                                class="bg-transparent border-none text-white text-2xl font-bold text-center w-full focus:ring-0 placeholder-white/50 resize-none overflow-hidden transition-colors duration-300"
                                placeholder="За какво мислите?"
                                oninput="this.style.height = ''; this.style.height = this.scrollHeight + 'px'"></textarea>
                        </div>

                        <div class="flex items-center gap-3 mt-4 w-full px-1">

                            <div class="flex gap-2 overflow-x-auto pb-2 flex-1 custom-scrollbar">
                                <button type="button" onclick="PostModal.setFbBg('#111111', false)" class="shrink-0 w-8 h-8 rounded-lg border-2 border-white shadow-sm bg-black"></button>
                                <button type="button" onclick="PostModal.setFbBg('linear-gradient(135deg, #667eea 0%, #764ba2 100%)', false)" class="shrink-0 w-8 h-8 rounded-lg border-2 border-white shadow-sm bg-[linear-gradient(135deg,#667eea,#764ba2)]"></button>
                                <button type="button" onclick="PostModal.setFbBg('linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', false)" class="shrink-0 w-8 h-8 rounded-lg border-2 border-white shadow-sm bg-[linear-gradient(135deg,#ff9a9e,#fecfef)]"></button>
                                <button type="button" onclick="PostModal.setFbBg('linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', false)" class="shrink-0 w-8 h-8 rounded-lg border-2 border-white shadow-sm bg-[linear-gradient(135deg,#4facfe,#00f2fe)]"></button>
                                <button type="button" onclick="PostModal.setFbBg('linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', false)" class="shrink-0 w-8 h-8 rounded-lg border-2 border-white shadow-sm bg-[linear-gradient(135deg,#43e97b,#38f9d7)]"></button>
                                <button type="button" onclick="PostModal.setFbBg('linear-gradient(135deg, #09203f 0%, #537895 100%)', false)" class="shrink-0 w-8 h-8 rounded-lg border-2 border-white shadow-sm bg-[linear-gradient(135deg,#09203f,#537895)]"></button>
                                <button type="button" onclick="PostModal.setFbBg('linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', false)" class="shrink-0 w-8 h-8 rounded-lg border-2 border-white shadow-sm bg-[linear-gradient(135deg,#f093fb,#f5576c)]"></button>
                                <button type="button" onclick="PostModal.setFbBg('linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', false)" class="shrink-0 w-8 h-8 rounded-lg border-2 border-white shadow-sm bg-[linear-gradient(135deg,#a18cd1,#fbc2eb)]"></button>
                                <button type="button" onclick="PostModal.setFbBg('linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)', false)" class="shrink-0 w-8 h-8 rounded-lg border-2 border-white shadow-sm bg-[linear-gradient(135deg,#6a11cb,#2575fc)]"></button>
                                <button type="button" onclick="PostModal.setFbBg('linear-gradient(135deg, #f6d365 0%, #fda085 100%)', false)" class="shrink-0 w-8 h-8 rounded-lg border-2 border-white shadow-sm bg-[linear-gradient(135deg,#f6d365,#fda085)]"></button>
                                <button type="button" onclick="PostModal.setFbBg('linear-gradient(135deg, #e6e9f0 0%, #eef1f5 100%)', false)" class="shrink-0 w-8 h-8 rounded-lg border-2 border-white shadow-sm bg-[linear-gradient(135deg,#e6e9f0,#eef1f5)]"></button>
                                <button type="button" onclick="PostModal.setFbBg('linear-gradient(135deg, #243949 0%, #517fa4 100%)', false)" class="shrink-0 w-8 h-8 rounded-lg border-2 border-white shadow-sm bg-[linear-gradient(135deg,#243949,#517fa4)]"></button>
                                <button type="button" onclick="PostModal.setFbBg('linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)', false)" class="shrink-0 w-8 h-8 rounded-lg border-2 border-white shadow-sm bg-[linear-gradient(135deg,#ee0979,#ff6a00)]"></button>
                                <button type="button" onclick="PostModal.setFbBg('linear-gradient(135deg, #13547a 0%, #80d0c7 100%)', false)" class="shrink-0 w-8 h-8 rounded-lg border-2 border-white shadow-sm bg-[linear-gradient(135deg,#13547a,#80d0c7)]"></button>
                                <div class="w-px h-8 bg-gray-200 mx-1 shrink-0"></div>

                                <?php
                                $patternPath = $_SERVER['DOCUMENT_ROOT'] . '/assets/images/patterns';
                                if (is_dir($patternPath)):
                                    $files = array_diff(scandir($patternPath), array('..', '.'));
                                    foreach ($files as $file):
                                        $imageUrl = '/assets/images/patterns/' . $file;
                                ?>
                                        <button type="button"
                                            onclick="PostModal.setFbBg('<?= $imageUrl ?>', true)"
                                            class="shrink-0 w-8 h-8 rounded-lg border-2 border-white shadow-sm bg-cover bg-center"
                                            style="background-image: url('<?= $imageUrl ?>')"></button>
                                <?php
                                    endforeach;
                                endif;
                                ?>
                            </div>

                            <div class="flex gap-2 pb-3">
                                <input type="file" id="fb-upload-input" class="hidden" accept="image/*" onchange="PostModal.handleFbImageUpload(this)">

                                <button type="button" onclick="document.getElementById('fb-upload-input').click()"
                                    class="shrink-0 w-8 h-8 rounded-lg border-2 border-dashed border-gray-400 flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors shadow-sm"
                                    title="Качи изображение">
                                    <i class="fa-solid "></i>
                                </button>

                                <div class="w-px h-8 bg-gray-200 mx-1 shrink-0"></div>

                                <button type="button" onclick="PostModal.setFbTextColor('#ffffff')" class="w-8 h-8 rounded-full border border-gray-300 bg-white flex items-center justify-center shadow-sm hover:scale-110 transition-transform" title="Бял текст">
                                    <span class="text-[10px] font-black text-black caps">A</span>
                                </button>
                                <button type="button" onclick="PostModal.setFbTextColor('#111111')" class="w-8 h-8 rounded-full border border-gray-300 bg-black flex items-center justify-center shadow-sm hover:scale-110 transition-transform" title="Тъмен текст">
                                    <span class="text-[10px] font-black text-white caps">A</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex justify-center gap-2 mt-4">
                    <button type="button" onclick="PostModal.toggleEditor()" class="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 rounded-full transition-all border border-gray-200 shadow-sm">
                        <i class="fas fa-code"></i>
                        <span id="toggle-text">HTML режим</span>
                    </button>

                    <button type="button" onclick="PostModal.toggleFbMode()" class="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-purple-600 bg-gray-100 hover:bg-purple-50 rounded-full transition-all border border-gray-200 shadow-sm">
                        <i class="fas fa-palette"></i>
                        <span id="fb-toggle-text">Режим Фон</span>
                    </button>
                </div>
            </div>

            <div class="p-4 border-t border-gray-100 flex justify-between bg-gray-50 rounded-b-xl">
                <div class="flex items-center space-x-1">
                    <button type="button" onclick="PostModal.saveDraft()" title="Запази чернова" class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200">
                        <i class="fas fa-save"></i>
                        <span>Запази чернова</span>
                    </button>
                </div>

                <div class="flex">
                    <button type="button" onclick="PostModal.close()" class="mr-2 px-4 py-2 text-gray-600 hover:text-gray-800 font-medium text-sm">
                        Отказ
                    </button>
                    <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors shadow-md text-sm">
                        <?= $submit_label ?? 'Запазване' ?>
                    </button>
                </div>
            </div>
        </form>
    </div>
</div>

<script>
    const PostModal = {
        el: null,
        box: null,
        isRawMode: false,
        isFbMode: false,
        isImageBg: false,
        currentFbBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        currentFbTextColor: '#ffffff',
        storageKey: 'draft_service_description_<?= md5($submit_url ?? 'default') ?>',

        init() {
            this.el = document.getElementById('custom-modal');
            this.box = document.getElementById('modal-box');
            this.checkDraftIndicator();

            this.el.addEventListener('click', (e) => {
                if (e.target === this.el) this.close();
            });
        },

        toggleFbMode() {
            const richContainer = document.getElementById('rich-editor-container');
            const rawContainer = document.getElementById('raw-editor-container');
            const fbContainer = document.getElementById('fb-editor-container');
            const fbText = document.getElementById('fb-text');

            if (!this.isFbMode) {
                if (!fbText.value.trim()) {
                    fbText.value = this.getCleanText();
                }
                richContainer.classList.add('hidden');
                rawContainer.classList.add('hidden');
                fbContainer.classList.remove('hidden');

                document.getElementById('fb-toggle-text').innerText = 'Назад';
                this.isRawMode = false;
                document.getElementById('toggle-text').innerText = 'HTML режим';
            } else {
                fbContainer.classList.add('hidden');
                richContainer.classList.remove('hidden');
                document.getElementById('fb-toggle-text').innerText = 'Режим Фон';
            }
            this.isFbMode = !this.isFbMode;
        },

        setFbTextColor(color) {
            this.currentFbTextColor = color;
            const textarea = document.getElementById('fb-text');
            textarea.style.color = color;

            if (color === '#ffffff') {
                textarea.classList.remove('placeholder-black/50');
                textarea.classList.add('placeholder-white/50');
            } else {
                textarea.classList.remove('placeholder-white/50');
                textarea.classList.add('placeholder-black/50');
            }
        },

        handleFbImageUpload(input) {
            if (input.files && input.files[0]) {
                const reader = new FileReader();

                reader.onload = (e) => {
                    const imageData = e.target.result;
                    this.setFbBg(imageData, true);
                    input.value = '';
                };

                reader.readAsDataURL(input.files[0]);
            }
        },

        setFbBg(value, isImage) {
            this.currentFbBg = value;
            this.isImageBg = isImage;
            const preview = document.getElementById('fb-preview');

            if (isImage) {
                preview.style.backgroundColor = 'transparent';
                preview.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.2)), url('${value}')`;
                preview.style.backgroundSize = 'cover';
                preview.style.backgroundPosition = 'center';
            } else {
                preview.style.backgroundImage = value.includes('gradient') ? value : 'none';
                preview.style.backgroundColor = value.includes('gradient') ? 'transparent' : value;

                if (value === '#111111') this.setFbTextColor('#ffffff');
            }
        },

        generateFbContent() {
            const text = document.getElementById('fb-text').value;
            const style = this.isImageBg ?
                `background-image: linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.2)), url('${this.currentFbBg}'); background-size: cover; background-position: center;` :
                `background: ${this.currentFbBg};`;

            return `<div style="${style} padding: 60px 20px; border-radius: 15px; text-align: center; color: ${this.currentFbTextColor}; font-size: 24px; font-weight: bold; min-height: 250px; display: flex; align-items: center; justify-content: center; text-shadow: ${this.currentFbTextColor === '#ffffff' ? '0 1px 3px rgba(0,0,0,0.3)' : 'none'}; line-height: 1.2;">${text}</div>`;
        },

        getCleanText() {
            const quill = this.getEditor();
            if (!quill) return '';
            const temp = document.createElement("div");
            temp.innerHTML = quill.root.innerHTML;
            return temp.textContent || temp.innerText || "";
        },

        toggleEditor() {
            if (this.isFbMode) this.toggleFbMode();

            const quill = this.getEditor();
            const richContainer = document.getElementById('rich-editor-container');
            const rawContainer = document.getElementById('raw-editor-container');
            const rawTextArea = document.getElementById('raw-editor');
            const toggleText = document.getElementById('toggle-text');

            if (!this.isRawMode) {
                rawTextArea.value = quill ? quill.root.innerHTML : '';
                richContainer.classList.add('hidden');
                rawContainer.classList.remove('hidden');
                toggleText.innerText = 'Визуален режим';
            } else {
                if (quill) {
                    quill.root.innerHTML = rawTextArea.value;
                    quill.update();
                }
                rawContainer.classList.add('hidden');
                richContainer.classList.remove('hidden');
                toggleText.innerText = 'HTML режим';
            }
            this.isRawMode = !this.isRawMode;
        },

        checkDraftIndicator() {
            const indicator = document.getElementById('draft-indicator');
            if (localStorage.getItem(this.storageKey)) {
                indicator.classList.remove('hidden');
            } else {
                indicator.classList.add('hidden');
            }
        },

        getEditor() {
            const editorContainer = this.el.querySelector('.wysiwyg-text');
            return editorContainer ? editorContainer.quill : null;
        },

        open() {
            this.el.classList.remove('hidden');
            this.el.classList.add('flex');
            setTimeout(() => {
                this.box.classList.remove('scale-95', 'opacity-0');
                this.box.classList.add('scale-100', 'opacity-100');
                this.autoLoadDraft();
            }, 100);
            document.body.style.overflow = 'hidden';
        },

        close() {
            this.box.classList.add('scale-95', 'opacity-0');
            this.box.classList.remove('scale-100', 'opacity-100');
            setTimeout(() => {
                this.el.classList.add('hidden');
                this.el.classList.remove('flex');
                document.body.style.overflow = '';
            }, 200);
        },

        saveDraft() {
            let dataToSave;

            if (this.isFbMode) {
                dataToSave = JSON.stringify({
                    type: 'fb-mode',
                    text: document.getElementById('fb-text').value,
                    bg: this.currentFbBg,
                    isImage: this.isImageBg,
                    textColor: this.currentFbTextColor,
                    html: this.generateFbContent()
                });
            } else if (this.isRawMode) {
                dataToSave = document.getElementById('raw-editor').value;
            } else {
                const quill = this.getEditor();
                dataToSave = quill ? quill.root.innerHTML : '';
            }

            if (!dataToSave || dataToSave === '<p><br></p>') {
                alert('Няма съдържание за запазване.');
                return;
            }

            localStorage.setItem(this.storageKey, dataToSave);
            this.checkDraftIndicator();
            alert('Черновата е запазена успешно.');
        },

        autoLoadDraft() {
            const saved = localStorage.getItem(this.storageKey);
            const quill = this.getEditor();
            if (!saved || !quill) return;

            const currentContent = quill.root.innerHTML;
            if (currentContent !== '<p><br></p>' && currentContent !== '' && currentContent !== '<p></p>') return;

            try {
                const data = JSON.parse(saved);

                if (data && data.type === 'fb-mode') {
                    document.getElementById('fb-text').value = data.text;
                    this.setFbBg(data.bg, data.isImage);
                    this.setFbTextColor(data.textColor);

                    quill.root.innerHTML = data.html;

                    if (!this.isFbMode) this.toggleFbMode();
                } else {
                    quill.root.innerHTML = saved;
                }
            } catch (e) {
                quill.root.innerHTML = saved;
            }

            quill.update();
            if (document.getElementById('raw-editor')) {
                document.getElementById('raw-editor').value = quill.root.innerHTML;
            }
        }
    };

    document.addEventListener('DOMContentLoaded', () => PostModal.init());
</script>
