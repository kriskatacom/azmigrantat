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

    <div class="fixed top-0 left-0 w-full h-10 z-9999 shadow-sm transition-colors duration-300
                bg-white border-b border-gray-100">

        <div class="admin-bar-scroll overflow-x-auto flex items-center h-full">
            <div class="container mx-auto flex items-center justify-between px-4 min-w-max gap-8">

                <div class="flex items-center gap-6 shrink-0 h-full">
                    <a href="/admin/dashboard" class="flex items-center gap-2 group whitespace-nowrap transition-colors
                                                       text-slate-500 hover:text-slate-900">
                        <i class="fa-solid fa-gauge-high text-xs opacity-70 group-hover:opacity-100"></i>
                        <span class="text-xs font-bold uppercase tracking-tight">Табло</span>
                    </a>

                    <?php if ($id): ?>
                        <a href="/admin/pages/edit/<?= $id ?>" class="flex items-center gap-2 group whitespace-nowrap transition-colors
                                                                     text-slate-500 hover:text-slate-900">
                            <i class="fa-solid fa-pen-to-square text-xs opacity-70 group-hover:opacity-100"></i>
                            <span class="text-xs font-bold uppercase tracking-tight">Редактирай</span>
                        </a>
                    <?php endif; ?>
                </div>

                <div class="flex items-center gap-6 shrink-0 h-full">

                    <div class="flex items-center gap-6 border-l border-gray-100 pl-6 h-full">
                        <a href="/admin/users/edit/<?= Auth::user()['id'] ?>"
                            class="flex items-center gap-3 group transition-all">
                            <div class="hidden sm:flex flex-col items-end">
                                <span
                                    class="text-[9px] uppercase font-bold leading-none mb-1 text-slate-400">Администратор</span>
                                <span class="text-xs font-bold leading-none transition-colors
                                           text-slate-700 group-hover:text-primary">
                                    <?= $user['name'] ?>
                                </span>
                            </div>

                            <?php if (!empty($user['profile_image'])): ?>
                                <img src="<?= $user['profile_image'] ?>"
                                    class="w-8 h-8 rounded-lg object-cover border border-gray-200 shadow-sm">
                            <?php else: ?>
                                <div class="w-8 h-8 rounded-lg flex items-center justify-center border shadow-inner transition-colors
                                            bg-gray-50 border-gray-200">
                                    <span class="text-[10px] font-bold text-slate-400 group-hover:text-primary uppercase">
                                        <?= mb_substr($user['name'], 0, 1) ?>
                                    </span>
                                </div>
                            <?php endif; ?>
                        </a>

                        <form action="/users/logout" method="POST" class="m-0 flex items-center h-full">
                            <button type="submit" class="group flex items-center gap-2 text-xs px-4 py-1.5 rounded-md uppercase font-bold transition-all duration-300 border
                                       bg-red-50 text-red-500 border-red-100 hover:bg-red-500 hover:text-white">
                                <span>Изход</span>
                                <i class="fa-solid fa-power-off text-xs group-hover:rotate-90 duration-300"></i>
                            </button>
                        </form>
                    </div>
                </div>

            </div>
        </div>
    </div>
<?php endif; ?>