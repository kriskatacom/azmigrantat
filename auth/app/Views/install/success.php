<?php

use App\Core\Session; ?>

<div class="min-h-screen bg-transparent flex items-center justify-center p-6">
    <div class="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-white/5 overflow-hidden">
        <div class="bg-linear-to-br from-emerald-500 to-teal-600 p-8 text-center">
            <div class="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4 animate-bounce">
                <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
            </div>
            <h1 class="text-3xl font-extrabold text-white tracking-tight">Готово!</h1>
            <p class="text-emerald-100 mt-2 italic text-sm">Системата е инсталирана успешно.</p>
        </div>

        <div class="p-8">
            <div class="space-y-6">
                <div class="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-100 dark:border-white/5">
                    <h3 class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Данни за достъп</h3>

                    <div class="space-y-4">
                        <div class="flex justify-between items-center">
                            <span class="text-slate-500 dark:text-slate-400 text-sm">База данни:</span>
                            <span class="font-mono text-slate-800 dark:text-emerald-400 font-semibold text-sm">
                                <?= htmlspecialchars($info['database']) ?>
                            </span>
                        </div>

                        <div class="flex justify-between items-center">
                            <span class="text-slate-500 dark:text-slate-400 text-sm">Потребител:</span>
                            <span class="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1 rounded-lg font-bold text-sm">
                                <?= htmlspecialchars($info['admin_user']) ?>
                            </span>
                        </div>

                        <div class="flex justify-between items-center">
                            <span class="text-slate-500 dark:text-slate-400 text-sm">Парола:</span>
                            <span class="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-lg font-mono font-bold text-sm tracking-wider">
                                <?= htmlspecialchars($info['admin_pass']) ?>
                            </span>
                        </div>
                    </div>
                </div>

                <div class="flex flex-col gap-3">
                    <a href="/users/login" class="w-full bg-slate-900 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-700 text-white text-center py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-slate-200 dark:hover:shadow-indigo-500/20">
                        Към вход <i class="fa-solid fa-arrow-right ml-2 text-sm"></i>
                    </a>
                </div>
            </div>
        </div>

        <div class="bg-slate-50 dark:bg-slate-900/30 p-4 text-center border-t border-slate-100 dark:border-white/5">
            <p class="text-[10px] text-slate-400 dark:text-slate-500 leading-tight uppercase font-medium">
                Запишете данните. Информацията ще се изтрие след презареждане.
            </p>
        </div>
    </div>
</div>

<?php Session::remove('install_success_info'); ?>