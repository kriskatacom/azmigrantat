<?php

use App\Core\Auth;

$id = $pageId ?? $elements['page_id'] ?? null;
$user = Auth::user();

if (Auth::isAdmin()): ?>
    <style>
        body {
            margin-top: 40px !important;
        }

        @media (max-width: 768px) {
            body {
                margin-top: 50px !important;
            }
        }

        .admin-bar-scroll::-webkit-scrollbar {
            display: none;
        }

        .admin-bar-scroll {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
    </style>

    <div class="fixed top-0 left-0 w-full h-10 bg-slate-900 text-white z-9999 shadow-lg border-b border-slate-700/50">
        <div class="admin-bar-scroll overflow-x-auto flex items-center h-full">
            <div class="container mx-auto flex items-center justify-between px-4 min-w-max gap-8">

                <div class="flex items-center gap-6 shrink-0 h-full">
                    <a href="/admin/dashboard" class="flex items-center gap-2 transition-colors group whitespace-nowrap">
                        <i class="fa-solid fa-gauge-high text-gray-500 hover:text-white duration-300 text-xs"></i>
                        <span class="text-xs font-semibold uppercase text-gray-500 hover:text-white duration-300">Табло</span>
                    </a>

                    <?php if ($id): ?>
                        <a href="/admin/pages/edit/<?= $id ?>" class="flex items-center gap-2 transition-colors group whitespace-nowrap">
                            <i class="fa-solid fa-pen-to-square text-gray-500 hover:text-white duration-300 text-xs"></i>
                            <span class="text-xs font-semibold uppercase text-gray-500 hover:text-white duration-300">Редактирай Страницата</span>
                        </a>
                    <?php endif; ?>

                    <div class="h-4 w-px bg-slate-700 shrink-0"></div>
                    <a href="/admin/media" class="flex items-center gap-2 hover:text-slate-300 transition-colors text-slate-400 whitespace-nowrap">
                        <i class="fa-solid fa-images text-xs text-gray-500 hover:text-white duration-300"></i>
                        <span class="text-xs font-bold uppercase text-gray-500 hover:text-white duration-300">Медия</span>
                    </a>
                </div>

                <div class="flex items-center gap-6 shrink-0">
                    <div class="hidden lg:flex items-center gap-2 text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 whitespace-nowrap">
                        <span class="relative flex h-1.5 w-1.5">
                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                        LIVE MODE
                    </div>

                    <div class="flex items-center gap-6 border-l border-slate-800 pl-6 h-full shrink-0">
                        <a href="/admin/users/edit/<?= Auth::user()['id'] ?>"
                            class="flex items-center gap-3 group/user hover:opacity-80 transition-all whitespace-nowrap">

                            <div class="hidden sm:flex flex-col items-end">
                                <span class="text-[9px] text-slate-500 uppercase tracking-tighter leading-none mb-1 group-hover/user:text-primary transition-colors">
                                    Администратор
                                </span>
                                <span class="text-xs text-slate-200 font-bold leading-none border-b border-transparent group-hover/user:border-primary/30">
                                    <?= $user['name'] ?>
                                </span>
                            </div>

                            <?php if (!empty($user['profile_image'])): ?>
                                <img src="<?= $user['profile_image'] ?>"
                                    alt="<?= $user['name'] ?>"
                                    class="w-8 h-8 rounded-lg object-cover border border-white/10 shadow-inner group-hover/user:border-primary/50 transition-all">
                            <?php else: ?>
                                <div class="w-8 h-8 bg-slate-800 border border-white/10 rounded-lg flex items-center justify-center shadow-inner group-hover/user:border-primary/50 group-hover/user:bg-primary/10 transition-all">
                                    <span class="text-[10px] font-semibold text-slate-400 group-hover/user:text-primary uppercase">
                                        <?= mb_substr($user['name'], 0, 1) ?>
                                    </span>
                                </div>
                            <?php endif; ?>
                        </a>

                        <form action="/users/logout" method="POST" class="m-0 p-0 flex shrink-0">
                            <button type="submit"
                                class="group flex items-center gap-2 text-xs bg-red-500/5 hover:bg-red-500 text-red-400 hover:text-white px-4 py-1.5 rounded-md uppercase font-semibold transition-all duration-300 cursor-pointer shadow-sm whitespace-nowrap">
                                <span>Изход</span>
                                <i class="fa-solid fa-power-off text-xs opacity-70 group-hover:rotate-90 transition-transform duration-300"></i>
                            </button>
                        </form>
                    </div>
                </div>

            </div>
        </div>
    </div>
<?php endif; ?>