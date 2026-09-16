<?php

$url = $link ?? '#';
$label = $text ?? 'Научи повече';
$add_classes = $add_classes ?? '';
?>

<a href="<?= $url ?>" class="group relative inline-flex items-center justify-center px-10 py-5 font-black uppercase text-sm transition-all duration-500 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-transparent shadow-2xl hover:shadow-indigo-500/40 <?= $add_classes ?>">
    <span class="absolute inset-0 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-linear-to-r from-indigo-600 via-purple-600 to-pink-500">
        <span class="block h-full w-full rounded-full bg-white dark:bg-slate-900"></span>
    </span>
    <span class="absolute inset-0 rounded-full bg-indigo-500/20 dark:bg-indigo-400/20 blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-700 -z-10 scale-150"></span>
    <span class="relative z-10 mr-6 text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-white transition-colors duration-300 font-normal">
        <?= $label ?>
    </span>
    <div class="relative z-10">
        <div class="flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 group-hover:bg-indigo-600 transition-all duration-500 transform group-hover:translate-x-2 shadow-sm group-hover:shadow-indigo-500/50">
            <svg class="w-6 h-6 text-indigo-600 dark:text-indigo-400 group-hover:text-white transition-colors duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
            </svg>
        </div>

        <span class="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full opacity-0 group-hover:opacity-100 animate-ping"></span>
    </div>
</a>
