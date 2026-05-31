<div x-data="{ openUsers: true }" class="mb-10">
    <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3 flex-1">
            <div class="h-px flex-1 bg-slate-200"></div>
            <span class="font-semibold uppercase text-slate-400 flex items-center gap-2">
                <i class="fa-solid fa-users-viewfinder"></i> Статистика Потребители
            </span>
            <div class="h-px flex-1 bg-slate-200"></div>
        </div>

        <button @click="openUsers = !openUsers" class="ml-4 p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-primary">
            <i class="fa-solid" :class="openUsers ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
        </button>
    </div>

    <div x-show="openUsers" x-collapse x-transition:enter.duration.300ms>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">

            <div class="bg-white p-8 rounded-lg shadow-sm border border-slate-200 group hover:border-primary transition-all">
                <div class="flex justify-between items-start mb-4 text-orange-500 group-hover:text-primary transition-colors">
                    <div class="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                        <i class="fa-solid fa-users text-xl"></i>
                    </div>
                    <span class="font-semibold uppercase opacity-60 text-xs">Регистрирани</span>
                </div>
                <div class="text-4xl font-semibold text-slate-900 italic"><?= $stats['total'] ?></div>
                <div class="text-sm font-bold text-slate-500 uppercase">Общо в базата</div>
                <div class="mt-4 text-xs font-semibold text-green-600 bg-green-50 inline-block px-2 py-1 rounded">
                    <i class="fa-solid fa-bolt mr-1"></i> <?= $stats['logged_today'] ?> активни днес
                </div>
            </div>

            <div class="bg-white p-8 rounded-lg shadow-sm border border-slate-200 group hover:border-emerald-500 transition-all">
                <div class="flex justify-between items-start mb-4 text-emerald-500">
                    <div class="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm">
                        <i class="fa-solid fa-user-check text-xl"></i>
                    </div>
                    <span class="font-semibold uppercase opacity-60 text-xs">Статус: Активни</span>
                </div>
                <div class="text-4xl font-semibold text-slate-900 italic"><?= $stats['active'] ?></div>
                <div class="text-sm font-bold text-slate-500 uppercase">Одобрени профили</div>
            </div>

            <div class="bg-white p-8 rounded-lg shadow-sm border border-slate-200 group hover:border-amber-500 transition-all">
                <div class="flex justify-between items-start mb-4 text-amber-500">
                    <div class="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all shadow-sm">
                        <i class="fa-solid fa-user-slash text-xl"></i>
                    </div>
                    <span class="font-semibold uppercase opacity-60 text-xs">Статус: Изчакващи</span>
                </div>
                <div class="text-4xl font-semibold text-slate-900 italic"><?= $stats['inactive'] ?></div>
                <div class="text-sm font-bold text-slate-500 uppercase">Неактивни/Блокирани</div>
            </div>
        </div>
    </div>
</div>

<div class="mb-6 flex items-center gap-3">
    <div class="h-px flex-1 bg-slate-200"></div>
    <span class="font-semibold uppercase text-slate-400">Системни ресурси</span>
    <div class="h-px flex-1 bg-slate-200"></div>
</div>

<div class="grid grid-cols-1 md:grid-cols-2 gap-5">
    <div class="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-center gap-6 hover:shadow-md transition-shadow">
        <div class="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl shrink-0 flex items-center justify-center">
            <i class="fa-solid fa-users-gear text-2xl"></i>
        </div>
        <div>
            <div class="text-2xl font-semibold text-slate-900 italic leading-none"><?= $stats['admins'] ?></div>
            <div class="font-semibold text-slate-400 uppercase mt-1">Административен екип</div>
        </div>
    </div>

    <?php

                                                                                    use App\Modules\Str;

 if ($stats['trashed'] > 0): ?>
        <div class="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-center gap-6 border-l-4 border-l-red-400 hover:shadow-md transition-shadow">
            <div class="w-14 h-14 bg-red-50 text-red-500 rounded-2xl shrink-0 flex items-center justify-center">
                <i class="fa-solid fa-trash-can text-2xl"></i>
            </div>
            <div>
                <div class="text-2xl font-semibold text-slate-900 italic leading-none"><?= $stats['trashed'] ?></div>
                <div class="font-semibold text-slate-400 uppercase mt-1">Изтрити (Soft Delete)</div>
            </div>
        </div>
    <?php endif; ?>
</div>

<div class="mt-8">
    <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold text-slate-800 flex items-center gap-2">
            <i class="fa-solid fa-users-viewfinder text-primary"></i>
            Активни в момента
        </h2>
        <span class="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
            Последни 5 сесии
        </span>
    </div>

    <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div class="divide-y divide-slate-100">
            <?php foreach ($sessions as $session): ?>
                <div class="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-sm">
                            <?= Str::initial($session->user->name) ?>
                        </div>
                        
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="font-semibold text-slate-900"><?= $session->user->name ?></span>
                                <?php if ($session->id === session_id()): ?>
                                    <span class="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase">Ти</span>
                                <?php endif; ?>
                            </div>
                            <div class="text-xs text-slate-500 flex items-center gap-2">
                                <span><?= $session->ip_address ?></span>
                                <span>•</span>
                                <span><?= date('H:i', $session->last_activity) ?></span>
                            </div>
                        </div>
                    </div>

                    <div class="hidden md:block text-right">
                        <div class="text-xs text-slate-400 max-w-40 truncate" title="<?= $session->user_agent ?>">
                            <i class="fa-solid fa-laptop-code mr-1"></i>
                            <span title="<?= $session->user_agent ?>"><?= $session->user_agent ?></span>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>

            <?php if ($sessions->isEmpty()): ?>
                <div class="p-8 text-center text-slate-400 italic text-sm">
                    Няма активни сесии в момента.
                </div>
            <?php endif; ?>
        </div>
    </div>
</div>
