<?php if ($items->hasPages()): ?>
    <?php
    $currentPage = $items->currentPage();
    $lastPage = $items->lastPage();
    $sidePages = 2;
    ?>
    <div class="mt-5 p-5 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div class="text-sm text-slate-500 order-2 md:order-1">
            Показване на <span class="font-semibold text-slate-700"><?= $items->firstItem() ?></span>
            до <span class="font-semibold text-slate-700"><?= $items->lastItem() ?></span>
            от <span class="font-semibold text-slate-700"><?= $items->total() ?></span> резултата
        </div>

        <nav class="flex items-center gap-1 order-1 md:order-2">
            <?php if ($items->onFirstPage()): ?>
                <span class="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed">
                    <i class="fa-solid fa-chevron-left text-xs"></i>
                </span>
            <?php else: ?>
                <a href="<?= $items->previousPageUrl() ?>" 
                   class="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary transition-all shadow-sm">
                    <i class="fa-solid fa-chevron-left text-xs"></i>
                </a>
            <?php endif; ?>

            <?php foreach ($items->getUrlRange(1, $lastPage) as $page => $url): ?>
                <?php
                $isCurrent = ($page == $currentPage);
                $isFirstOrLast = ($page == 1 || $page == $lastPage);
                $isInRange = (abs($page - $currentPage) <= $sidePages);

                if (!$isFirstOrLast && !$isInRange) {
                    if ($page == 2 || $page == $lastPage - 1) {
                        echo '<span class="w-8 h-10 flex items-center justify-center text-slate-400">...</span>';
                    }
                    continue;
                }

                $baseClasses = "min-w-[2.5rem] h-10 px-2 flex items-center justify-center rounded-lg border font-medium transition-all shadow-sm text-sm";
                $activeClasses = "bg-primary border-primary text-white pointer-events-none";
                $inactiveClasses = "bg-white border-slate-200 text-slate-600 hover:border-primary hover:text-primary";
                
                $finalClasses = $baseClasses . " " . ($isCurrent ? $activeClasses : $inactiveClasses);
                ?>
                <a href="<?= $url ?>" class="<?= $finalClasses ?>">
                    <?= $page ?>
                </a>
            <?php endforeach; ?>

            <?php if ($items->hasMorePages()): ?>
                <a href="<?= $items->nextPageUrl() ?>" 
                   class="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary transition-all shadow-sm">
                    <i class="fa-solid fa-chevron-right text-xs"></i>
                </a>
            <?php else: ?>
                <span class="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed">
                    <i class="fa-solid fa-chevron-right text-xs"></i>
                </span>
            <?php endif; ?>
        </nav>
    </div>
<?php endif; ?>