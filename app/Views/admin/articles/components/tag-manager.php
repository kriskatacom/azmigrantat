<?php $uniqueId = $name . '_' . uniqid(); ?>

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 5px;
    }

    .custom-scrollbar::-webkit-scrollbar-track {
        background: #f1f1f1;
    }

    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 10px;
    }

    .tag-option.is-selected {
        background-color: #f1f5f9;
        color: #94a3b8;
        cursor: default;
        pointer-events: none;
    }

    .tag-option.is-selected .check-icon {
        display: block !important;
    }
</style>

<div id="wrapper_<?= $uniqueId ?>" class="space-y-3 tag-manager-component relative">
    <div class="flex items-center justify-between">
        <label class="block text-sm font-semibold text-slate-700">
            <?= $label ?? 'Тагове' ?>
        </label>
        <button type="button" id="clear-all-<?= $uniqueId ?>"
            class="text-[10px] text-red-500 hover:text-red-700 font-medium transition-colors hidden">
            <i class="fa-solid fa-trash-can mr-1"></i> Премахни всички
        </button>
    </div>

    <div class="relative">
        <div class="relative">
            <i class="fa-solid fa-tags absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input type="text" autocomplete="off"
                class="tag-input w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
                placeholder="Търси или добави нов...">
        </div>

        <div class="tag-dropdown hidden fixed z-9999 bg-white rounded-xl shadow-2xl py-1 max-h-56 overflow-y-auto custom-scrollbar border border-slate-100">
            <?php foreach ($available as $tag):
                $isSelected = $selected->contains('id', $tag->id);
            ?>
                <div class="tag-option px-4 py-2 text-sm text-slate-600 hover:bg-primary/5 hover:text-primary cursor-pointer transition-colors flex items-center justify-between <?= $isSelected ? 'is-selected' : '' ?>"
                    data-name="<?= htmlspecialchars($tag->name) ?>"
                    data-id="<?= $tag->id ?>">
                    <span class="flex items-center gap-2">
                        <i class="fa-solid fa-hashtag text-[10px] opacity-30"></i>
                        <?= htmlspecialchars($tag->name) ?>
                    </span>
                    <i class="fa-solid fa-check check-icon text-[10px] text-emerald-500 hidden"></i>
                </div>
            <?php endforeach; ?>
            <div class="no-results hidden px-4 py-3 text-xs text-slate-400 italic text-center">Няма резултати</div>
        </div>
    </div>

    <div class="tags-container flex flex-wrap gap-2 p-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-300 min-h-12">
        <?php foreach ($selected as $tag): ?>
            <div class="tag-badge flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-medium shadow-sm ring-1 ring-slate-900/5" data-tag-id="<?= $tag->id ?>">
                <span><?= htmlspecialchars($tag->name) ?></span>
                <input type="hidden" name="<?= $name ?>[]" value="<?= $tag->id ?>">
                <button type="button" class="remove-tag text-slate-400 hover:text-red-500 transition-colors">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        <?php endforeach; ?>
        <?php if ($selected->isEmpty()): ?>
            <p class="no-tags-msg text-xs text-slate-400 italic flex items-center gap-2 m-auto">Няма добавени тагове</p>
        <?php endif; ?>
    </div>

    <script>
        (function() {
            const wrapper = document.getElementById('wrapper_<?= $uniqueId ?>');
            const input = wrapper.querySelector('.tag-input');
            const dropdown = wrapper.querySelector('.tag-dropdown');
            const options = wrapper.querySelectorAll('.tag-option');
            const container = wrapper.querySelector('.tags-container');
            const clearBtn = document.getElementById('clear-all-<?= $uniqueId ?>');
            const fieldName = '<?= $name ?>';

            const updateDropdownPosition = () => {
                const rect = input.getBoundingClientRect();
                dropdown.style.top = (rect.bottom + 5) + 'px';
                dropdown.style.left = rect.left + 'px';
                dropdown.style.width = rect.width + 'px';
            };

            const toggleClearButton = () => {
                const hasBadges = container.querySelectorAll('.tag-badge').length > 0;
                clearBtn.classList.toggle('hidden', !hasBadges);
            };

            const markOptionAsSelected = (id, isSelected) => {
                const option = Array.from(options).find(opt => opt.dataset.id == id);
                if (option) {
                    option.classList.toggle('is-selected', isSelected);
                }
            };

            const removeTag = (badgeElement, id) => {
                badgeElement.remove();
                markOptionAsSelected(id, false);

                if (container.querySelectorAll('.tag-badge').length === 0) {
                    container.innerHTML = '<p class="no-tags-msg text-xs text-slate-400 italic flex items-center gap-2 m-auto">Няма добавени тагове</p>';
                }
                toggleClearButton();
            };

            const addBadge = (name, id) => {
                const msg = container.querySelector('.no-tags-msg');
                if (msg) msg.remove();

                if (container.querySelector(`[data-tag-id="${id}"]`)) return;

                const badge = document.createElement('div');
                badge.className = 'tag-badge flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-medium shadow-sm ring-1 ring-slate-900/5 animate-in fade-in zoom-in duration-200';
                badge.setAttribute('data-tag-id', id);
                badge.innerHTML = `
                    <span>${name}</span>
                    <input type="hidden" name="${fieldName}[]" value="${id}">
                    <button type="button" class="remove-btn text-slate-400 hover:text-red-500 transition-colors">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                `;

                badge.querySelector('.remove-btn').onclick = (e) => {
                    e.preventDefault();
                    removeTag(badge, id);
                };

                container.appendChild(badge);
                markOptionAsSelected(id, true);
                toggleClearButton();
                input.value = '';
            };

            container.querySelectorAll('.tag-badge').forEach(badge => {
                const id = badge.getAttribute('data-tag-id');
                badge.querySelector('.remove-tag').onclick = (e) => {
                    e.preventDefault();
                    removeTag(badge, id);
                };
            });
            toggleClearButton();

            clearBtn.onclick = () => {
                container.querySelectorAll('.tag-badge').forEach(badge => {
                    const id = badge.getAttribute('data-tag-id');
                    markOptionAsSelected(id, false);
                    badge.remove();
                });
                container.innerHTML = '<p class="no-tags-msg text-xs text-slate-400 italic flex items-center gap-2 m-auto">Няма добавени тагове</p>';
                toggleClearButton();
            };

            input.addEventListener('focus', () => {
                updateDropdownPosition();
                dropdown.classList.remove('hidden');
            });

            input.addEventListener('input', function() {
                const val = this.value.toLowerCase().trim();
                let hasResults = false;
                dropdown.classList.remove('hidden');
                options.forEach(opt => {
                    const text = opt.dataset.name.toLowerCase();
                    const isVisible = text.includes(val);
                    opt.classList.toggle('hidden', !isVisible);
                    if (isVisible) hasResults = true;
                });
                wrapper.querySelector('.no-results').classList.toggle('hidden', hasResults);
            });

            options.forEach(opt => {
                opt.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    if (!opt.classList.contains('is-selected')) {
                        addBadge(opt.dataset.name, opt.dataset.id);
                    }
                });
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = input.value.trim();
                    if (!val) return;
                    const exact = Array.from(options).find(o => o.dataset.name.toLowerCase() === val.toLowerCase());
                    addBadge(val, exact ? exact.dataset.id : 'new:' + val);
                }
            });

            document.addEventListener('mousedown', (e) => {
                if (!wrapper.contains(e.target) && !dropdown.contains(e.target)) dropdown.classList.add('hidden');
            });

            window.addEventListener('scroll', () => {
                if (!dropdown.classList.contains('hidden')) updateDropdownPosition();
            }, true);
        })();
    </script>
</div>
