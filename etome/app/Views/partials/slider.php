<?php
$id = $id ?? 'swiper_' . uniqid();
$bulletColor = $bulletColor ?? 'emerald';
?>

<div class="<?= $id ?>-container w-full overflow-hidden">
    <div class="max-w-2xl mx-auto px-5 mb-5">
        <div class="flex justify-between items-center bg-white/80 dark:bg-slate-900/50 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-slate-100 dark:border-white/5">

            <button class="<?= $id ?>-prev flex items-center gap-3 pl-6 pr-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all group active:scale-95 outline-none">
                <i class="fa-solid fa-arrow-left-long text-<?= $bulletColor ?>-500 group-hover:-translate-x-1 transition-transform"></i>
                <span class="text-[11px] font-black uppercase tracking-widest text-slate-500">Назад</span>
            </button>

            <div class="flex-1 px-4 block">
                <div class="h-1 w-full bg-<?= $bulletColor ?>-500/10 rounded-full overflow-hidden relative">
                    <div class="<?= $id ?>-progress absolute top-0 left-0 h-full w-0 bg-<?= $bulletColor ?>-500 rounded-full transition-none"></div>
                </div>
            </div>

            <button class="<?= $id ?>-next flex items-center gap-3 pr-6 pl-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all group active:scale-95 outline-none">
                <span class="text-[11px] font-black uppercase tracking-widest text-slate-500">Напред</span>
                <i class="fa-solid fa-arrow-right-long text-<?= $bulletColor ?>-500 group-hover:translate-x-1 transition-transform"></i>
            </button>

        </div>
    </div>

    <div class="swiper <?= $id ?> w-full">
        <div class="swiper-wrapper">
            <?= $slot ?>
        </div>
    </div>
</div>

<script>
    document.addEventListener('DOMContentLoaded', function() {
        const progressLine = document.querySelector('.<?= $id ?>-progress');

        new Swiper('.<?= $id ?>', {
            loop: true,
            spaceBetween: 10,
            speed: 800,
            grabCursor: true,
            observer: true,
            observeParents: true,
            watchSlidesProgress: true,

            autoplay: {
                delay: 6000,
                disableOnInteraction: false,
            },

            navigation: {
                nextEl: '.<?= $id ?>-next',
                prevEl: '.<?= $id ?>-prev',
            },

            on: {
                autoplayTimeLeft(s, time, progress) {
                    if (progressLine) {
                        progressLine.style.width = `${(1 - progress) * 100}%`;
                    }
                },
                slideChange() {
                    if (progressLine) {
                        progressLine.style.transition = 'none';
                        progressLine.style.width = '0';
                    }
                }
            },

            breakpoints: {
                320: { slidesPerView: 1, spaceBetween: 20 },
                768: { slidesPerView: 2, spaceBetween: 30 },
                1280: { slidesPerView: 3, spaceBetween: 32 }
            }
        });
    });
</script>