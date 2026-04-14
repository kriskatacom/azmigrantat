<section id="all-cities" class="bg-white dark:bg-slate-950 py-20 px-6 overflow-hidden transition-colors duration-300">
    <div class="max-w-7xl mx-auto space-y-12">
        <?php foreach (CITIES as $city): ?>
            <div class="flex flex-col md:flex-row items-center gap-12 bg-slate-50 dark:bg-slate-900/30 p-8 md:p-12 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl transition-all">

                <div class="w-full md:w-1/2 relative group">
                    <div class="absolute -inset-1 bg-linear-to-r from-blue-600 to-indigo-600 rounded-3xl blur opacity-10 dark:opacity-25 group-hover:opacity-30 dark:group-hover:opacity-50 transition duration-1000"></div>

                    <div class="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700">
                        <img src="<?php echo $city['image']; ?>"
                            alt="Изработка на сайтове <?php echo $city['name']; ?>"
                            class="w-full h-75 object-cover transform group-hover:scale-105 transition duration-700">

                        <div class="absolute bottom-0 left-0 right-0 p-6 bg-linear-to-t from-slate-900 dark:from-slate-950 to-transparent">
                            <span class="text-white font-bold text-2xl"><?php echo $city['name']; ?></span>
                        </div>
                    </div>
                </div>

                <div class="w-full md:w-1/2 space-y-6">
                    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-medium">
                        <span class="relative flex h-2 w-2">
                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span class="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        Налично във Вашия регион
                    </div>

                    <h2 class="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white leading-tight">
                        Дигитален растеж за бизнеса в <span class="text-blue-600 dark:text-blue-500"><?php echo $city['name']; ?></span>
                    </h2>

                    <p class="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
                        <?php echo $city['long_desc']; ?>
                    </p>

                    <div class="pt-4 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        <a href="<?php echo $city['slug']; ?>" class="inline-flex items-center justify-center px-8 py-4 border border-transparent text-base font-semibold rounded-2xl text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95">
                            Научете повече
                            <svg class="ml-2 -mr-1 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                            </svg>
                        </a>

                        <div class="flex flex-col">
                            <span class="text-slate-500 dark:text-slate-500 text-sm italic">
                                * Поддръжка на място за град <?php echo $city['name']; ?>
                            </span>
                            <span class="text-xs text-blue-600/70 dark:text-blue-400/50 font-medium">Директна връзка: 24/7</span>
                        </div>
                    </div>
                </div>

            </div>
        <?php endforeach; ?>
    </div>
</section>