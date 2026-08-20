<?php

/**
 * @var string $name 
 * @var string $label 
 * @var string $value 
 */
$uniqueId = 'editor_' . bin2hex(random_bytes(4));
$name = $name ?? 'content';
$label = $label ?? 'Съдържание';
$value = $value ?? '';
?>

<div class="group relative" id="parent_<?= $uniqueId ?>">
    <div id="image-controls">
        <button type="button" onclick="updateImg('align', 'left')">← Ляво</button>
        <button type="button" onclick="updateImg('align', 'center')">↔ Център</button>
        <button type="button" onclick="updateImg('align', 'right')">Дясно →</button>
        <div class="separator"></div>
        <button type="button" onclick="updateImg('size', '10%')">10%</button>
        <button type="button" onclick="updateImg('size', '20%')">20%</button>
        <button type="button" onclick="updateImg('size', '25%')">25%</button>
        <button type="button" onclick="updateImg('size', '30%')">30%</button>
        <button type="button" onclick="updateImg('size', '40%')">40%</button>
        <button type="button" onclick="updateImg('size', '50%')">50%</button>
        <button type="button" onclick="updateImg('size', '75%')">75%</button>
        <button type="button" onclick="updateImg('size', '100%')">100%</button>
        <div class="separator"></div>
        <button type="button" onclick="updateImg('delete')" style="color: #ef4444;">Изтрий</button>
    </div>

    <div id="table-controls" style="display: none;">
        <button type="button" onclick="tableAction('insertRowBelow')">+ Ред</button>
        <button type="button" onclick="tableAction('insertColumnRight')">+ Колона</button>
        <button type="button" onclick="tableAction('deleteRow')">- Ред</button>
        <button type="button" onclick="tableAction('deleteColumn')">- Колона</button>
        <div class="separator"></div>
        <button type="button" onclick="tableAction('mergeCells')">Обедини</button>
        <button type="button" onclick="tableAction('unmergeCells')">Раздели</button>
        <button type="button" onclick="tableAction('deleteTable')" style="color: #ef4444;">Изтрий таблица</button>
    </div>

    <div id="loader_<?= $uniqueId ?>" class="hidden absolute inset-0 z-10000 bg-white/60 backdrop-blur-[2px]">
        <div class="w-full h-full flex flex-col items-center justify-center">
            <svg class="animate-spin h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="text-xs font-bold mt-2 uppercase text-indigo-600 tracking-widest">Качване...</span>
        </div>
    </div>

    <label class="block text-sm font-medium text-slate-700 mb-1">
        <?= $label ?>
    </label>

    <div class="editor-wrapper w-full bg-white border border-slate-200 rounded-lg overflow-hidden focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all">
        <div id="<?= $uniqueId ?>" style="height: 450px;" class="wysiwyg-text text-lg border-none!">
            <?= $value ?>
        </div>
    </div>

    <input type="hidden" name="<?= $name ?>" id="input_<?= $uniqueId ?>" value="<?= htmlspecialchars($value) ?>">
</div>

<style>
    /* ФИКС ЗА БУТОНА (Икона) */
    .ql-fullscreen {
        width: 28px !important;
        height: 28px !important;
        display: flex !important;
        align-items: center;
        justify-content: center;
    }

    .ql-fullscreen::before {
        content: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>') !important;
        line-height: 0;
    }

    .ql-editor img {
        max-width: 100%;
        height: auto;
        border-radius: 8px;
        margin: 10px 0;
        display: block;
    }

    .ql-container.ql-snow {
        border: none !important;
        font-family: inherit !important;
        font-size: 1.125rem !important;
    }

    /* ЦЕНТРИРАН FOCUS MODE */
    .quill-fullscreen {
        position: fixed !important;
        inset: 0 !important;
        z-index: 9999 !important;
        background: rgba(15, 23, 42, 0.9) !important;
        display: flex !important;
        flex-direction: column !important;
        /* Подрежда елементите вертикално */
        align-items: center !important;
        justify-content: center !important;
        padding: 20px !important;
    }

    /* Скриваме лейбъла само във fullscreen, за да не се пречка */
    .quill-fullscreen label {
        display: none !important;
    }

    .quill-fullscreen .editor-wrapper {
        width: 100% !important;
        max-width: 900px !important;
        height: 85vh !important;
        border-radius: 16px !important;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
        background: white !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
        /* Важно за заоблените ъгли */
    }

    .quill-fullscreen .ql-container {
        flex: 1 !important;
        overflow-y: auto !important;
    }

    /* Фикс за лоудъра във fullscreen */
    .quill-fullscreen #loader_<?= $uniqueId ?> {
        position: fixed !important;
        border-radius: 16px;
        max-width: 900px;
        margin: auto;
    }

    /* Приспособяване за малки екрани */
    @media (max-width: 1024px) {
        .quill-fullscreen .editor-wrapper {
            max-width: 95% !important;
            height: 95vh !important;
        }
    }

    /* Общ стил за контролните панели (черен фон) */
    #image-controls,
    #table-controls {
        display: none;
        position: absolute;
        background: #1e293b;
        border-radius: 8px;
        padding: 5px;
        z-index: 1000;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
        gap: 5px;
        align-items: center;
    }

    /* Стил за бутоните в панелите */
    #image-controls button,
    #table-controls button {
        color: white;
        padding: 4px 10px;
        font-size: 12px;
        border-radius: 4px;
        border: 1px solid #334155;
        background: transparent;
        cursor: pointer;
        transition: all 0.2s;
    }

    #image-controls button:hover,
    #table-controls button:hover {
        background: #4f46e5;
        /* Indigo цвят при посочване */
        border-color: #4f46e5;
    }

    #parent_<?= $uniqueId ?> {
        position: relative;
        /* Важно за top/left изчисленията */
    }

    #table-controls {
        display: none;
        position: absolute;
        /* Увери се, че z-index е достатъчно висок */
        z-index: 1000;
    }

    /* Визуално маркиране на клетките в Quill 2.0 */
    .ql-editor td.ql-table-select,
    .ql-editor th.ql-table-select {
        background-color: rgba(79, 70, 229, 0.15) !important;
        /* Indigo прозрачен фон */
        border: 2px double #4f46e5 !important;
        /* Подчертана рамка */
    }

    /* Правим курсора по-интуитивен за таблици */
    .ql-editor table {
        cursor: cell;
    }

    /* Позволяваме нормална селекция, Quill 2.0 сам ще се погрижи за другото */
    .ql-editor td {
        user-select: text !important;
        -webkit-user-select: text !important;
        cursor: cell;
        /* Сменя курсора на кръстче, което е по-интуитивно за таблици */
    }

    /* Визуално подчертаваме селектираните клетки за обединяване */
    .ql-editor td.ql-table-select {
        background-color: rgba(79, 70, 229, 0.2) !important;
        /* Indigo цвят */
        border: 2px solid #4f46e5 !important;
        position: relative;
        z-index: 10;
    }

    /* Връщаме възможността за писане, но само когато сме вътре в параграф в клетката */
    .ql-editor td>p {
        user-select: text;
        -webkit-user-select: text;
    }

    /* Допълнителен фикс за видимост на селекцията */
    .ql-editor td.ql-table-select {
        background-color: rgba(79, 70, 229, 0.2) !important;
        border: 1px solid #4f46e5 !important;
    }

    /* Маркиране на клетките в лилаво */
    .ql-editor td.ql-table-select,
    .ql-editor th.ql-table-select {
        background-color: rgba(79, 70, 229, 0.15) !important;
        border: 1px double #4f46e5 !important;
    }

    /* Забраняваме на браузъра да маркира ТЕКСТА синьо, докато влачим в таблица */
    .ql-editor td {
        user-select: none;
        -webkit-user-select: none;
    }

    /* Позволяваме текстът да се избира само когато пишем вътре */
    .ql-editor td>p {
        user-select: text;
        -webkit-user-select: text;
    }
</style>

<script>
    (function() {
        // 1. Дефинираме базовия формат
        const Video = Quill.import('formats/video');
        class PlainVideo extends Video {}
        Quill.register(PlainVideo, true);

        // 1. Регистрираме форматите, за да може Quill да записва inline стилове (width, float)
        const ImageFormat = Quill.import('formats/image');

        if (typeof ImageResize !== 'undefined') {
            Quill.register('modules/imageResize', ImageResize.default || ImageResize);
        }

        class CustomizableImage extends ImageFormat {
            static formats(domNode) {
                let formats = super.formats(domNode);
                if (domNode.hasAttribute('style')) {
                    formats['style'] = domNode.getAttribute('style');
                }
                if (domNode.hasAttribute('width')) {
                    formats['width'] = domNode.getAttribute('width');
                }
                return formats;
            }

            format(name, value) {
                if (name === 'style' || name === 'width') {
                    if (value) {
                        this.domNode.setAttribute(name, value);
                    } else {
                        this.domNode.removeAttribute(name);
                    }
                } else {
                    super.format(name, value);
                }
            }
        }

        Quill.register(CustomizableImage, true);

        const init = () => {
            const container = document.querySelector('#<?= $uniqueId ?>');
            const hiddenInput = document.querySelector('#input_<?= $uniqueId ?>');
            const parent = document.querySelector('#parent_<?= $uniqueId ?>');
            const loader = document.querySelector('#loader_<?= $uniqueId ?>');

            if (!container || !hiddenInput || container.quill) return;

            const Delta = Quill.import('delta');

            const quill = new Quill(container, {
                theme: 'snow',
                modules: {
                    table: true,
                    toolbar: {
                        imageResize: {
                            modules: ['Resize', 'DisplaySize', 'Toolbar'], // Позволява преоразмеряване и тулбар за подравняване
                            handleStyles: {
                                backgroundColor: '#4f46e5', // Indigo-600 цвят за маркерите
                                border: 'none',
                                color: 'white'
                            },
                            toolbarStyles: {
                                backgroundColor: '#1e293b',
                                border: 'none',
                                color: 'white'
                            }
                        },
                        container: [
                            [{
                                'header': [1, 2, 3, 4, false]
                            }],
                            ['bold', 'italic', 'underline', 'strike'],
                            [{
                                'color': []
                            }, {
                                'background': []
                            }],
                            [{
                                'list': 'ordered'
                            }, {
                                'list': 'bullet'
                            }],
                            [{
                                'align': []
                            }],
                            ['link', 'image', 'video', 'youtube', 'table', 'blockquote'], // Добавяме 'youtube' тук
                            ['fullscreen'],
                            ['clean']
                        ],
                        handlers: {
                            table: function() {
                                const tableModule = this.quill.getModule('table');
                                tableModule.insertTable(3, 3);
                            },
                            image: function() {
                                selectLocalImage(this.quill);
                            },
                            video: function() {
                                selectLocalVideo(this.quill);
                            },
                            youtube: function() {
                                const range = this.quill.getSelection();
                                let url = prompt('Въведете YouTube URL линк:');

                                if (url) {
                                    // Ето я "магията" за моментално преобразуване:
                                    let videoId = '';

                                    if (url.includes('v=')) {
                                        videoId = url.split('v=')[1].split('&')[0];
                                    } else if (url.includes('youtu.be/')) {
                                        videoId = url.split('youtu.be/')[1].split('?')[0];
                                    } else if (url.includes('embed/')) {
                                        videoId = url.split('embed/')[1].split('?')[0];
                                    }

                                    // Ако е YouTube линк, го правим на embed веднага
                                    if (videoId) {
                                        url = `https://www.youtube.com/embed/${videoId}`;
                                    }

                                    // Вкарваме вече "поправения" линк в Quill
                                    this.quill.insertEmbed(range.index, 'video', url);
                                    this.quill.setSelection(range.index + 1);
                                }
                            },
                            fullscreen: function() {
                                toggleFullscreen();
                            }
                        }
                    },
                    clipboard: {
                        matchers: [
                            ['VIDEO', function(node, delta) {
                                const src = node.getAttribute('src');
                                return new Delta().insert({
                                    video: src
                                });
                            }]
                        ]
                    }
                }
            });

            // Постави това в init функцията
            quill.root.addEventListener('mousedown', (e) => {
                // Ако кликнем върху клетка, оставяме Quill да си свърши работата по селекцията
                const cell = e.target.closest('td');
                if (cell) {
                    // Не викаме e.preventDefault(), за да може курсорът да влезе в клетката
                    // Не викаме e.stopPropagation(), за да може Table модулът да види клика
                }
            }, false);

            const syncContent = () => {
                let html = quill.root.innerHTML;
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;

                const iframes = tempDiv.querySelectorAll('iframe.ql-video');

                iframes.forEach(iframe => {
                    let src = iframe.getAttribute('src');

                    // 1. АВТОМАТИЧНА КОРЕКЦИЯ НА YOUTUBE ЛИНКОВЕ
                    if (src.includes('youtube.com') || src.includes('youtu.be')) {
                        let videoId = '';

                        // Вариант 1: watch?v=ID
                        if (src.includes('v=')) {
                            videoId = src.split('v=')[1].split('&')[0];
                        }
                        // Вариант 2: youtu.be/ID
                        else if (src.includes('youtu.be/')) {
                            videoId = src.split('youtu.be/')[1].split('?')[0];
                        }
                        // Вариант 3: Вече е embed, но може да няма параметри
                        else if (src.includes('embed/')) {
                            videoId = src.split('embed/')[1].split('?')[0];
                        }

                        if (videoId) {
                            // ПРЕВРЪЩАМЕ ГО В РАБОТЕЩ EMBED ЛИНК
                            src = `https://www.youtube.com/embed/${videoId}`;
                        }

                        // Настройваме атрибутите за правилно показване
                        iframe.setAttribute('src', src);
                        iframe.setAttribute('width', '100%');
                        iframe.setAttribute('height', '450');
                        iframe.setAttribute('frameborder', '0');
                        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
                        iframe.setAttribute('allowfullscreen', 'true');
                        iframe.className = 'ql-video'; // Важно за стиловете
                        iframe.style.width = '100%';
                        iframe.style.aspectRatio = '16/9';
                        iframe.style.borderRadius = '8px';
                    }
                    // 2. ЛОКАЛНИ ВИДЕА
                    else {
                        const videoTag = document.createElement('video');
                        videoTag.setAttribute('controls', 'true');
                        videoTag.setAttribute('src', src);
                        videoTag.setAttribute('width', '100%');
                        videoTag.style.maxWidth = '100%';
                        videoTag.style.display = 'block';
                        videoTag.style.borderRadius = '8px';
                        videoTag.style.margin = '10px 0';
                        iframe.parentNode.replaceChild(videoTag, iframe);
                    }
                });

                const images = tempDiv.querySelectorAll('img[style*="float"]');
                images.forEach(img => {
                    // Намираме последния елемент в текущата група и му казваме да "изчисти" флоата
                    let parentP = img.closest('p');
                    if (parentP) {
                        parentP.style.clear = 'both';
                    }
                });

                // Записваме изчистения HTML в скрития input
                hiddenInput.value = (tempDiv.innerHTML === '<p><br></p>') ? '' : tempDiv.innerHTML;
            };

            // Качване на локално видео
            const selectLocalVideo = (quill) => {
                const input = document.createElement('input');
                input.setAttribute('type', 'file');
                input.setAttribute('accept', 'video/mp4,video/webm');
                input.click();

                input.onchange = async () => {
                    const file = input.files[0];
                    if (!file) return;

                    loader.classList.remove('hidden');
                    const formData = new FormData();
                    formData.append('video', file);

                    try {
                        const response = await fetch('/admin/media/upload-video', {
                            method: 'POST',
                            body: formData,
                            headers: {
                                'X-Requested-With': 'XMLHttpRequest'
                            }
                        });
                        const result = await response.json();
                        if (result.url) {
                            const range = quill.getSelection(true);
                            const url = result.url.startsWith('/') ? result.url : '/' + result.url;
                            quill.insertEmbed(range.index, 'video', url);
                            quill.setSelection(range.index + 1);
                        }
                    } catch (e) {
                        console.error(e);
                    } finally {
                        loader.classList.add('hidden');
                    }
                };
            };

            const selectLocalImage = (quill) => {
                const input = document.createElement('input');
                input.setAttribute('type', 'file');
                input.setAttribute('accept', 'image/*');
                input.click();
                input.onchange = async () => {
                    const file = input.files[0];
                    if (!file) return;
                    loader.classList.remove('hidden');
                    const formData = new FormData();
                    formData.append('image', file);
                    try {
                        const response = await fetch('/admin/uploads/upload-image', {
                            method: 'POST',
                            body: formData
                        });
                        const result = await response.json();
                        if (result.url) {
                            const range = quill.getSelection(true);
                            quill.insertEmbed(range.index, 'image', result.url);
                        }
                    } catch (e) {
                        console.error(e);
                    } finally {
                        loader.classList.add('hidden');
                    }
                };
            };

            // Клик извън таблицата също да скрива панела
            quill.root.addEventListener('click', (e) => {
                if (!e.target.closest('td')) {
                    document.getElementById('table-controls').style.display = 'none';
                }
            });

            const toggleFullscreen = () => {
                const isFull = parent.classList.toggle('quill-fullscreen');
                document.body.style.overflow = isFull ? 'hidden' : '';
            };

            quill.on('text-change', syncContent);

            // Експонираме обекта
            container.quill = quill;

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && parent.classList.contains('quill-fullscreen')) {
                    toggleFullscreen();
                }
            });

            window.tableAction = function(action) {
                const tableModule = quill.getModule('table');
                if (!tableModule) return;

                try {
                    if (action === 'mergeCells') {
                        tableModule.mergeCells();
                    } else if (action === 'unmergeCells') {
                        // В Quill 2.0 методът е просто .unmerge()
                        if (typeof tableModule.unmerge === 'function') {
                            tableModule.unmerge();
                        } else if (typeof tableModule.unmergeCells === 'function') {
                            tableModule.unmergeCells();
                        }
                    } else if (action === 'deleteTable') {
                        tableModule.deleteTable();
                    } else if (action === 'insertRowBelow') {
                        tableModule.insertRowBelow();
                    } else if (action === 'insertColumnRight') {
                        tableModule.insertColumnRight();
                    } else if (action === 'deleteRow') {
                        tableModule.deleteRow();
                    } else if (action === 'deleteColumn') {
                        tableModule.deleteColumn();
                    }
                } catch (e) {
                    console.error("Quill Table Error: ", e);
                }
                quill.focus();
            };

            quill.on('selection-change', function(range) {
                const tableControls = document.getElementById('table-controls');

                setTimeout(() => {
                    // Проверяваме дали има селектирани клетки (Quill 2.0 ползва специални класове)
                    const hasSelectedCells = container.querySelectorAll('.ql-table-select').length > 0;

                    const selection = window.getSelection();
                    if (!selection.rangeCount && !hasSelectedCells) {
                        tableControls.style.display = 'none';
                        return;
                    }

                    const rangeNode = selection.rangeCount > 0 ? selection.getRangeAt(0).startContainer : null;
                    const element = rangeNode ? (rangeNode.nodeType === 3 ? rangeNode.parentElement : rangeNode) : null;

                    const table = element ? element.closest('table') : container.querySelector('.ql-table-select')?.closest('table');

                    if (table) {
                        tableControls.style.display = 'flex';
                        const editorRect = parent.getBoundingClientRect();
                        const tableRect = table.getBoundingClientRect();

                        tableControls.style.top = (tableRect.top - editorRect.top - 45) + 'px';
                        tableControls.style.left = (tableRect.left - editorRect.left) + 'px';

                        // Динамично активираме/деактивираме бутона Merge
                        const mergeBtn = tableControls.querySelector('button[onclick*="mergeCells"]');
                        if (mergeBtn) {
                            mergeBtn.style.opacity = hasSelectedCells ? '1' : '0.5';
                            mergeBtn.style.pointerEvents = hasSelectedCells ? 'auto' : 'none';
                        }
                    } else {
                        tableControls.style.display = 'none';
                    }
                }, 50);
            });

            container.addEventListener('click', (e) => {
                if (e.target.tagName === 'IMG') {
                    const img = e.target;
                    syncContent();
                }
            });
            container.addEventListener('dragstart', (e) => {
                if (e.target.closest('table')) {
                    e.preventDefault();
                }
            });
        };

        if (typeof Quill !== 'undefined') {
            init();
        } else {
            window.addEventListener('load', init);
        }
    })();

    document.querySelector('.ql-video').setAttribute('title', 'Качи видео файл от компютъра');
    document.querySelector('.ql-youtube').setAttribute('title', 'Вгради YouTube видео чрез линк');
</script>

<script>
    let currentSelectedImg = null;

    const imageControls = document.getElementById('image-controls');

    // Показване на контролите при клик върху снимка
    document.querySelector('#<?= $uniqueId ?>').addEventListener('click', (e) => {
        if (e.target.tagName === 'IMG') {
            currentSelectedImg = e.target;
            const rect = currentSelectedImg.getBoundingClientRect();
            const wrapperRect = document.querySelector('#parent_<?= $uniqueId ?>').getBoundingClientRect();

            imageControls.style.display = 'flex';
            imageControls.style.top = (rect.top - wrapperRect.top - 45) + 'px';
            imageControls.style.left = (rect.left - wrapperRect.left) + 'px';
        } else {
            imageControls.style.display = 'none';
        }
    });

    // Функция за обновяване на снимката
    window.updateImg = (type, value) => {
        if (!currentSelectedImg) return;

        if (type === 'align') {
            if (value === 'left') {
                currentSelectedImg.style.float = 'left';
                currentSelectedImg.style.display = 'inline';
                currentSelectedImg.style.margin = '0 20px 10px 0';
            } else if (value === 'right') {
                currentSelectedImg.style.float = 'right';
                currentSelectedImg.style.display = 'inline';
                currentSelectedImg.style.margin = '0 0 10px 20px';
            } else if (value === 'center') {
                currentSelectedImg.style.float = 'none';
                currentSelectedImg.style.display = 'block';
                currentSelectedImg.style.margin = '10px auto';
            }
        } else if (type === 'size') {
            currentSelectedImg.style.width = value;
            currentSelectedImg.style.height = 'auto';
        } else if (type === 'delete') {
            currentSelectedImg.remove();
            imageControls.style.display = 'none';
        }

        // Ръчно извикваме синхронизацията на Quill
        const editorId = '<?= $uniqueId ?>';
        const container = document.getElementById(editorId);
        if (container.quill) {
            // Трик, за да накараме Quill да разбере, че има промяна
            const html = container.querySelector('.ql-editor').innerHTML;
            document.getElementById('input_' + editorId).value = html;
        }
    };

    // Скриване при скрол или клик извън редактора
    document.addEventListener('mousedown', (e) => {
        if (!imageControls.contains(e.target) && e.target.tagName !== 'IMG') {
            imageControls.style.display = 'none';
        }
    });
</script>

<style>
    .ql-youtube {
        width: 28px !important;
        height: 28px !important;
        display: flex !important;
        align-items: center;
        justify-content: center;
    }

    .ql-youtube::before {
        content: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.14 1 12 1 12s0 3.86.46 5.58a2.78 2.78 0 0 0 1.94 2c1.72.42 8.6.42 8.6.42s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.86 23 12 23 12s0-3.86-.46-5.58z"></path><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"></polygon></svg>') !important;
        line-height: 0;
    }

    /* Стилизиране на подравнени изображения в редактора */
    .ql-editor img[style*="float: left"] {
        float: left;
        margin-right: 15px;
        margin-bottom: 5px;
    }

    .ql-editor img[style*="float: right"] {
        float: right;
        margin-left: 15px;
        margin-bottom: 5px;
    }

    .ql-editor img[style*="display: block; margin: auto"] {
        float: none;
        display: block;
        margin: 10px auto;
    }

    /* Изчистване на флоата след параграфа, за да не се застъпват */
    .ql-editor p::after {
        content: "";
        display: table;
        clear: both;
    }

    /* Фикс за контролите на Image Resize модула */
    .ql-editor img {
        cursor: pointer;
        transition: box-shadow 0.2s;
    }

    .ql-editor img:hover {
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.4);
    }

    /* Когато изображението е подравнено, текстът трябва да го обикаля */
    .ql-editor .ql-video,
    .ql-editor img {
        margin: 5px;
    }

    /* Изчистване на флоата в редактора */
    .ql-editor p::after {
        content: "";
        display: table;
        clear: both;
    }

    #image-controls {
        display: none;
        position: absolute;
        background: #1e293b;
        border-radius: 8px;
        padding: 5px;
        z-index: 1000;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
        gap: 5px;
        align-items: center;
    }

    #image-controls button {
        color: white;
        padding: 4px 8px;
        font-size: 12px;
        border-radius: 4px;
        transition: background 0.2s;
        border: 1px solid #334155;
    }

    #image-controls button:hover {
        background: #4f46e5;
    }

    #image-controls .separator {
        width: 1px;
        height: 20px;
        background: #334155;
        margin: 0 5px;
    }

    .wysiwyg-text p {
        display: block;

        overflow: hidden;
        unicode-bidi: isolate;
    }

    .wysiwyg-text img[style*="float: left"] {
        margin: 0 20px 10px 0 !important;
    }

    .wysiwyg-text img[style*="float: right"] {
        margin: 0 0 10px 20px !important;
    }

    .ql-editor table {
        border-collapse: collapse;
        width: 100%;
        margin-bottom: 10px;
    }

    .ql-editor td {
        border: 1px solid #cbd5e1 !important;
        padding: 8px;
        position: relative;
    }

    /* Стил за селектираните клетки (важно за обединяването) */
    .ql-editor .ql-table-select {
        background-color: rgba(79, 70, 229, 0.1);
        border: 2px solid #4f46e5 !important;
    }

    /* Настройка на изскачащото меню за таблици (за да изглежда като вашите контроли) */
    .ql-table-operations {
        background-color: #1e293b !important;
        border-radius: 8px !important;
        border: none !important;
        color: white !important;
        padding: 5px !important;
    }

    .ql-table-operations a {
        color: white !important;
        padding: 5px 10px !important;
    }

    .ql-table-operations a:hover {
        background-color: #4f46e5 !important;
    }
</style>