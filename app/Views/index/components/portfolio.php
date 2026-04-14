<?php

use App\Core\View;

$projects = $projects ?? [];
$showAllLink = $show_all_link ?? false;
?>

<section class="relative py-24 bg-slate-50 dark:bg-[#0a0f1a] transition-colors duration-700">
    <div class="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none"></div>

    <div class="container mx-auto px-6 relative z-10">
        <div class="flex flex-col mb-20">
            <div class="overflow-hidden mb-4">
                <span class="inline-block text-indigo-600 dark:text-indigo-400 font-bold tracking-[0.4em] uppercase text-xs transform transition-transform duration-700" data-aos="reveal-up">
                    Portfolio
                </span>
            </div>
            <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                <h2 class="text-5xl md:text-7xl font-light text-slate-900 dark:text-white leading-none tracking-tight">
                    Избрани <span class="font-black italic">проекти</span>
                </h2>
                <p class="max-w-md text-slate-600 dark:text-slate-400 border-l-2 border-indigo-600 pl-6 py-2">
                    Дигитални решения, които комбинират естетика и функционалност за вашия бизнес.
                </p>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24">
            <?php foreach ($projects as $index => $project):
                $isWide = ($index % 3 === 0);
                $colSpan = $isWide ? 'lg:col-span-12' : 'lg:col-span-6';
            ?>
                <div class="<?= $colSpan ?>" data-aos="fade-up" data-aos-delay="<?= $index * 100 ?>">
                    <a href="<?= $project['link'] ?>" target="_blank" class="group block relative">
                        <div class="relative overflow-hidden rounded-2xl bg-slate-200 dark:bg-slate-800 aspect-video lg:aspect-video mb-8 shadow-sm group-hover:shadow-2xl transition-all duration-500">
                            <div class="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 flex items-center justify-center">
                                <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center transform scale-50 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-500 delay-100">
                                    <i class="fa-solid fa-arrow-right -rotate-45 text-indigo-600 text-xl"></i>
                                </div>
                            </div>

                            <img src="<?= $project['image'] ?>"
                                alt="<?= $project['title'] ?>"
                                class="w-full h-full object-cover transform transition-transform duration-1000 group-hover:scale-105">

                            <div class="absolute bottom-6 left-6 z-20 flex flex-wrap gap-2">
                                <?php foreach (array_slice($project['tags'], 0, 3) as $tag): ?>
                                    <span class="px-4 py-1.5 rounded-lg bg-black/20 backdrop-blur-md border border-white/10 text-[10px] font-medium text-white uppercase tracking-wider opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
                                        <?= $tag ?>
                                    </span>
                                <?php endforeach; ?>
                            </div>
                        </div>

                        <div class="flex justify-between items-start gap-4">
                            <div>
                                <span class="text-indigo-600 dark:text-indigo-400 font-mono text-sm mb-2 block">/ 0<?= $index + 1 ?></span>
                                <h3 class="text-3xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors tracking-tight">
                                    <?= $project['title'] ?>
                                </h3>
                                <p class="text-slate-500 dark:text-slate-400 mt-2 font-medium"><?= $project['category'] ?></p>
                            </div>
                            <div class="pt-4">
                                <div class="h-px w-12 bg-slate-300 dark:bg-slate-700 group-hover:w-20 group-hover:bg-indigo-600 transition-all duration-500"></div>
                            </div>
                        </div>
                    </a>
                </div>
            <?php endforeach; ?>
        </div>

        <?php if ($showAllLink): ?>
            <div class="mt-32 flex flex-col items-center">
                <div class="h-24 w-px bg-linear-to-b from-indigo-600 to-transparent mb-8"></div>
                <a href="/projects" class="relative inline-flex items-center gap-4 group">
                    <span class="text-xl font-bold dark:text-white uppercase tracking-widest group-hover:pr-4 transition-all">Всички проекти</span>
                    <div class="w-12 h-12 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-all">
                        <i class="fa-solid fa-chevron-right text-sm dark:text-white group-hover:text-white"></i>
                    </div>
                </a>
            </div>
        <?php endif; ?>
    </div>
</section>
