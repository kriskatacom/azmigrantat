<?php

use App\Core\View;

$id = 'faq-main';
$bulletColor = 'emerald';
?>

<section class="relative py-10 md:py-14 bg-white dark:bg-[#0b1120] overflow-hidden">
    <div class="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>

    <div class="container mx-auto px-4 relative z-10">
        <div class="flex flex-col items-center mb-10 gap-5">
            <div class="max-w-2xl text-center">
                <h2 class="text-[clamp(2rem,5vw,3.5rem)] font-black text-slate-900 dark:text-white tracking-tighter leading-none uppercase mb-5">
                    Имаш <span class="text-emerald-600 dark:text-emerald-400 italic">въпроси?</span><br>
                    Имам отговори.
                </h2>
                <p class="max-w-lg mx-auto text-slate-600 dark:text-slate-400 font-medium text-lg">
                    Подбрах най-важните неща, които клиентите ме питат преди да започнем работа.
                </p>
            </div>
        </div>

        <div class="w-full bg-slate-50/50 dark:bg-white/2 md:border-t md:border-slate-50 md:dark:border-white/5 rounded-md py-5">

            <?php ob_start(); ?>

            <div class="swiper-slide p-5 md:p-10 flex flex-col justify-center">
                <div class="mb-5 flex items-center gap-4">
                    <span class="font-black text-emerald-500 uppercase">Въпрос 01</span>
                    <div class="h-px flex-1 bg-slate-100 dark:bg-white/5"></div>
                </div>
                <h3 class="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight italic uppercase tracking-tighter mb-5">Колко време отнема изработката?</h3>
                <p class="text-slate-600 dark:text-slate-400 text-lg">Стандартен бизнес сайт отнема между 2 и 4 седмици, в зависимост от сложността и обратната връзка.</p>
            </div>

            <div class="swiper-slide p-5 md:p-10 flex flex-col justify-center">
                <div class="mb-5 flex items-center gap-4">
                    <span class="font-black text-emerald-500 uppercase">Въпрос 02</span>
                    <div class="h-px flex-1 bg-slate-100 dark:bg-white/5"></div>
                </div>
                <h3 class="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight italic uppercase tracking-tighter mb-5">Собственик ли съм на кода?</h3>
                <p class="text-slate-600 dark:text-slate-400 text-lg">Абсолютно. След приключване на проекта, получавате пълен достъп до сорс кода и всички права върху интелектуалната собственост.</p>
            </div>

            <div class="swiper-slide p-5 md:p-10 flex flex-col justify-center">
                <div class="mb-5 flex items-center gap-4">
                    <span class="font-black text-emerald-500 uppercase">Въпрос 03</span>
                    <div class="h-px flex-1 bg-slate-100 dark:bg-white/5"></div>
                </div>
                <h3 class="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight italic uppercase tracking-tighter mb-5">Предлагате ли поддръжка?</h3>
                <p class="text-slate-600 dark:text-slate-400 text-lg">Да, предлагам различни планове за техническа поддръжка, за да бъде сайтът ти винаги актуален и защитен.</p>
            </div>

            <div class="swiper-slide p-5 md:p-10 flex flex-col justify-center">
                <div class="mb-5 flex items-center gap-4">
                    <span class="font-black text-emerald-500 uppercase">Въпрос 04</span>
                    <div class="h-px flex-1 bg-slate-100 dark:bg-white/5"></div>
                </div>
                <h3 class="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight italic uppercase tracking-tighter mb-5">Сайтът ще бъде ли мобилен?</h3>
                <p class="text-slate-600 dark:text-slate-400 text-lg">Всеки проект се разработва с "Mobile-First" подход, гарантиращ перфектно изживяване на телефони, таблети и десктоп машини.</p>
            </div>

            <?php $faqContent = ob_get_clean();
            View::component('slider', 'partials', [
                'id' => $id,
                'bulletColor' => $bulletColor,
                'slot' => $faqContent
            ]); ?>

            <div class="p-4 md:p-5 bg-slate-50/50 dark:bg-white/2 border-t border-slate-50 dark:border-white/5">
                <div class="flex justify-between items-center bg-white dark:bg-slate-800 p-2 md:rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 rounded-xl">
                    <button class="<?= $id ?>-prev flex items-center gap-2 md:gap-3 pl-4 md:pl-6 pr-3 md:pr-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all group active:scale-95 outline-none">
                        <i class="fa-solid fa-arrow-left-long text-<?= $bulletColor ?>-500 group-hover:-translate-x-1 transition-transform"></i>
                        <span class="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-500">Назад</span>
                    </button>

                    <div class="<?= $id ?>-pagination swiper-pagination relative bottom-0 w-auto"></div>

                    <button class="<?= $id ?>-next flex items-center gap-2 md:gap-3 pr-4 md:pr-6 pl-3 md:pl-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all group active:scale-95 outline-none">
                        <span class="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-500">Напред</span>
                        <i class="fa-solid fa-arrow-right-long text-<?= $bulletColor ?>-500 group-hover:translate-x-1 transition-transform"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>
</section>