<div x-data="{ 
        shown: false,
        lockScroll() {
            document.body.style.overflow = this.shown ? 'hidden' : '';
        }
     }"
    x-init="$watch('shown', value => lockScroll())"
    @open-popup-<?= $id ?>.window="shown = true"
    @keydown.escape.window="shown = false"
    class="fixed inset-0 z-100 pointer-events-none">
    <div x-show="shown"
        class="absolute inset-0 flex items-center justify-center pointer-events-auto"
        style="display: none;">

        <div x-show="shown"
            x-transition:enter="transition opacity ease-out duration-300"
            x-transition:enter-start="opacity-0"
            x-transition:enter-end="opacity-100"
            x-transition:leave="transition opacity ease-in duration-200"
            @click="shown = false"
            class="absolute inset-0 bg-slate-900/60 backdrop-blur-md cursor-pointer">
        </div>

        <div x-show="shown"
            x-transition:enter="transition cubic-bezier(0.34, 1.56, 0.64, 1) duration-500"
            x-transition:enter-start="opacity-0 scale-50 rotate-6"
            x-transition:enter-end="opacity-100 scale-100 rotate-0"
            x-transition:leave="transition ease-in duration-300"
            x-transition:leave-start="opacity-100 scale-100"
            x-transition:leave-end="opacity-0 scale-90"
            class="relative w-full max-w-lg bg-white dark:bg-slate-900 p-1 shadow-2xl rounded-md shadow-<?= $color ?>-500/20 border border-white/10 max-h-screen custom-scrollbar overflow-auto">

            <div class="bg-white dark:bg-slate-900 rounded-[3.4rem] p-8 md:p-10">

                <button @click="shown = false"
                    class="absolute top-2 right-2 w-12 h-12 bg-white dark:bg-slate-800 rounded-md shadow-xl flex items-center justify-center text-slate-400 hover:text-<?= $color ?>-500 transition-colors border border-slate-100 dark:border-white/10 z-10">
                    <i class="fa-solid fa-times text-xl"></i>
                </button>

                <div class="text-center mb-8">
                    <div class="w-16 h-16 bg-<?= $color ?>-500/10 text-<?= $color ?>-500 rounded-3xl flex items-center justify-center text-2xl mx-auto mb-4 rotate-3">
                        <i class="fa-solid fa-circle-info"></i>
                    </div>
                    <h3 class="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                        <?= $title ?>
                    </h3>
                </div>

                <div class="text-center mb-8">
                    <p class="text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                        <?= $content ?>
                    </p>
                </div>

                <?php if (!empty($examples)): ?>
                    <div class="flex flex-wrap justify-center gap-2 mb-8">
                        <?php foreach ($examples as $example): ?>
                            <span class="px-4 py-2 rounded-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 font-black uppercase text-slate-600 dark:text-slate-300">
                                <?= $example ?>
                            </span>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>

                <?php if (!empty($info_footer)): ?>
                    <div class="my-8 p-6 rounded-3xl bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 text-center">
                        <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Защо това е важно?</p>
                        <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
                            "<?= $info_footer ?>"
                        </p>
                    </div>
                <?php endif; ?>

                <button @click="shown = false"
                    class="w-full py-4 rounded-2xl bg-<?= $color ?>-600 text-white font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-<?= $color ?>-500/30 hover:bg-<?= $color ?>-700 transition-all active:scale-95">
                    Разбрах, благодаря!
                </button>
            </div>
        </div>
    </div>
</div>
