<?php

use App\Services\HelperService;
?>
<div x-data="{ 
    langModal: false, 
    search: '',
    languages: <?= htmlspecialchars(json_encode(HelperService::AVAILABLE_LANGUAGES)) ?>
}" class="relative">

    <button @click="langModal = true" class="hover:text-primary-light transition flex items-center gap-1 group relative outline-none">
        <div class="relative p-1">
            <i class="fa-solid fa-earth-europe text-white text-2xl group-hover:rotate-12 transition-transform duration-300"></i>
            <span class="absolute -top-1 -right-1 flex h-5 w-5">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-light opacity-75"></span>
                <span class="relative inline-flex rounded-full h-5 w-5 bg-primary-light text-[9px] items-center justify-center text-black font-black uppercase shadow-sm">
                    <?= $_SESSION['lang'] ?? 'bg' ?>
                </span>
            </span>
        </div>
    </button>

    <template x-teleport="body">
        <div x-show="langModal"
            x-cloak
            /* ЗАКЛЮЧВАНЕ НА СКРОЛА ПРИ ОТВОРЕН МОДАЛ */
            x-effect="langModal ? document.body.classList.add('overflow-hidden') : document.body.classList.remove('overflow-hidden')"
            class="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6"
            @keydown.escape.window="langModal = false">

            <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                x-show="langModal"
                x-transition:enter="transition ease-out duration-300"
                x-transition:enter-start="opacity-0"
                x-transition:enter-end="opacity-100"
                x-transition:leave="transition ease-in duration-200"
                x-transition:leave-start="opacity-100"
                x-transition:leave-end="opacity-0"
                @click="langModal = false"></div>

            <div class="relative bg-[#1e293b] border border-white/10 w-full max-w-2xl rounded-4xl shadow-2xl overflow-hidden flex flex-col"
                x-show="langModal"
                x-transition:enter="transition ease-out duration-300"
                x-transition:enter-start="opacity-0 scale-95 translate-y-4"
                x-transition:enter-end="opacity-100 scale-100 translate-y-0"
                x-transition:leave="transition ease-in duration-200"
                x-transition:leave-start="opacity-100 scale-100 translate-y-0"
                x-transition:leave-end="opacity-0 scale-95 translate-y-4"
                @click.stop>

                <div class="p-6 space-y-4 bg-linear-to-b from-white/5 to-transparent">
                    <div class="flex justify-between items-center">
                        <div class="flex items-center gap-3">
                            <div class="p-2 bg-primary-light/10 rounded-lg">
                                <i class="fa-solid fa-language text-primary-light text-xl"></i>
                            </div>
                            <h3 class="text-xl font-bold text-white tracking-tight"><?= HelperService::trans('select_language') ?></h3>
                        </div>
                        <button @click="langModal = false" class="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>

                    <div class="relative">
                        <i class="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm"></i>
                        <input x-model="search"
                            type="text"
                            placeholder="<?= HelperService::trans('languages_search') ?>"
                            class="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-light/50 transition-all">
                    </div>
                </div>

                <div class="px-6 pb-6 overflow-y-auto max-h-[50vh] custom-scrollbar grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    <?php foreach (HelperService::AVAILABLE_LANGUAGES as $code => $data): ?>
                        <a href="<?= HelperService::langUrl(null, $code) ?>"
                            x-show="'<?= addslashes(mb_strtolower($data['name'])) ?>'.includes(search.toLowerCase()) || '<?= $code ?>'.includes(search.toLowerCase())"
                            /* ПЛАВНО ЗАТВАРЯНЕ ПРЕДИ ПРЕНАСОЧВАНЕ */
                            @click.prevent="
                                langModal = false;
                                document.body.classList.remove('overflow-hidden');
                                setTimeout(() => { 
                                    window.location.href = '<?= HelperService::langUrl(null, $code) ?>' 
                                }, 300)
                            "
                            class="flex items-center gap-3 p-3.5 rounded-2xl transition-all group border border-transparent 
                           <?= ($_SESSION['lang'] ?? 'bg') === $code
                                ? 'bg-primary-light font-bold shadow-lg shadow-primary-light/20 text-black'
                                : 'hover:bg-white/5 text-gray-300 hover:text-white hover:border-white/10' ?>">

                            <span class="text-2xl drop-shadow-sm group-hover:scale-110 transition-transform"><?= $data['flag'] ?></span>
                            <span class="text-sm tracking-wide"><?= $data['name'] ?></span>

                            <?php if (($_SESSION['lang'] ?? 'bg') === $code): ?>
                                <i class="fa-solid fa-circle-check ml-auto text-black"></i>
                            <?php endif; ?>
                        </a>
                    <?php endforeach; ?>
                </div>

                <div class="p-4 bg-slate-900/80 border-t border-white/5 text-center">
                    <p class="text-[11px] text-gray-500 uppercase tracking-widest font-medium">
                        <i class="fa-solid fa-circle-info mr-1 text-primary-light/50"></i>
                        <?= HelperService::trans('auto_translate_notice') ?>
                    </p>
                </div>
            </div>
        </div>
    </template>
</div>
