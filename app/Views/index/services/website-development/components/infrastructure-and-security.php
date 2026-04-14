<?php

use App\Core\View;

$hoverGradients = [
    'indigo'  => 'hover:bg-gradient-to-br hover:from-white hover:to-indigo-50/50 dark:hover:to-indigo-900/10',
    'emerald' => 'hover:bg-gradient-to-br hover:from-white hover:to-emerald-50/50 dark:hover:to-emerald-900/10',
    'blue'    => 'hover:bg-gradient-to-br hover:from-white hover:to-blue-50/50 dark:hover:to-blue-900/10',
    'violet'  => 'hover:bg-gradient-to-br hover:from-white hover:to-violet-50/50 dark:hover:to-violet-900/10',
    'sky'     => 'hover:bg-gradient-to-br hover:from-white hover:to-sky-50/50 dark:hover:to-sky-900/10',
];

$colorMapper = [
    'indigo'  => [
        'bg-light' => 'bg-indigo-500/10',
        'bg-solid' => 'bg-indigo-600',
        'text'     => 'text-indigo-500',
        'text-dark' => 'text-indigo-600',
        'border'   => 'hover:border-indigo-500/30'
    ],
    'emerald' => [
        'bg-light' => 'bg-emerald-500/10',
        'bg-solid' => 'bg-emerald-600',
        'text'     => 'text-emerald-500',
        'text-dark' => 'text-emerald-600',
        'border'   => 'hover:border-emerald-500/30'
    ],
    'blue'    => [
        'bg-light' => 'bg-blue-500/10',
        'bg-solid' => 'bg-blue-600',
        'text'     => 'text-blue-500',
        'text-dark' => 'text-blue-600',
        'border'   => 'hover:border-blue-500/30'
    ],
    'violet'  => [
        'bg-light' => 'bg-violet-500/10',
        'bg-solid' => 'bg-violet-600',
        'text'     => 'text-violet-500',
        'text-dark' => 'text-violet-600',
        'border'   => 'hover:border-violet-500/30'
    ],
    'sky'     => [
        'bg-light' => 'bg-sky-500/10',
        'bg-solid' => 'bg-sky-600',
        'text'     => 'text-sky-500',
        'text-dark' => 'text-sky-600',
        'border'   => 'hover:border-sky-500/30'
    ],
];

$services = [
    [
        'id'      => 'hosting',
        'title'   => 'NVMe Хостинг',
        'content' => 'Твоят сайт ще живее на ултра-бързи NVMe сървъри. Това гарантира светкавично зареждане — ключов фактор за Google.',
        'icon'    => 'fa-microchip',
        'color'   => 'indigo',
        'features' => ['99.9% Uptime', 'Ежедневен Backup'],
        'popup'   => [
            'title'   => 'NVMe Хостинг Технология',
            'content' => 'Сайтът ти се хоства на високоскоростна NVMe инфраструктура от JumpBG. NVMe е модерна технология за съхранение на данни.',
            'items'   => ['LiteSpeed Web Server', 'LSCache ускорение', 'QUIC.cloud CDN', 'DDoS защита'],
            'footer'  => 'Комбинацията от NVMe дискове и LiteSpeed сървъри означава по-бързо зареждане и стабилност.'
        ]
    ],
    [
        'id'      => 'ssl',
        'title'   => 'SSL Сигурност',
        'content' => 'Сигурността не е опция, а стандарт. Криптираме връзката с Вашите клиенти и защитаваме данните им.',
        'icon'    => 'fa-house-lock',
        'color'   => 'emerald',
        'features' => ['HTTPS Протокол', 'Пълна защита'],
        'popup'   => [
            'title'   => 'SSL и Защита на данните',
            'content' => 'SSL криптира връзката между браузъра и сървъра. Конфигурираме сертификати чрез Let’s Encrypt.',
            'items'   => ['TLS 1.3 криптиране', 'Let’s Encrypt сертификати', 'HSTS защита'],
            'footer'  => 'Активният SSL е задължителен за всеки модерен сайт.'
        ]
    ],
    [
        'id'      => 'dns',
        'title'   => 'Домейн & DNS',
        'content' => 'Помагам при избора и регистрацията на име за твоя бизнес. Твоят уникален адрес в мрежата.',
        'icon'    => 'fa-at',
        'color'   => 'blue',
        'features' => ['.BG, .COM, .EU', 'DNS Мениджмънт'],
        'popup'   => [
            'title'   => 'DNS Мениджмънт',
            'content' => 'DNS системата насочва домейна ти към сървъра. Оптимизираме записите за работа с Cloudflare.',
            'items'   => ['A/MX/CNAME записи', 'Cloudflare Proxy'],
            'footer'  => 'Правилно настроеният DNS гарантира бърз и сигурен достъп.'
        ]
    ],
    [
        'id'      => 'custom-mvc',
        'title'   => 'Чист Код (MVC)',
        'content' => 'Не използвам готови шаблони. Изграждам твоя проект върху собствена архитектура за максимална скорост.',
        'icon'    => 'fa-code',
        'color'   => 'violet',
        'features' => ['PHP 8.3+ Архитектура', 'Scalable Clean Code'],
        'popup'   => [
            'title'   => 'Custom PHP MVC Архитектура',
            'content' => 'Моята архитектура разделя данните от дизайна, което позволява безкрайно надграждане и сигурност.',
            'items'   => ['PHP 8.3+', 'Clean Code', 'Modular Logic'],
            'footer'  => 'Твоят сайт получава чиста енергия – работи само това, което е необходимо.'
        ]
    ],
    [
        'id'      => 'unlimited-resources',
        'title'   => 'Безлимитна Мощ',
        'content' => 'Забрави за ограниченията. Твоят бизнес получава свобода за мащабиране без компромис.',
        'icon'    => 'fa-infinity',
        'color'   => 'sky',
        'features' => ['Неограничен Трафик', 'Unlimited Inodes'],
        'popup'   => [
            'title'   => 'Ресурси без изкуствени граници',
            'content' => 'Инфраструктурата е проектирана да издържа на екстремно натоварване без допълнителни такси.',
            'items'   => ['Неограничен трафик', 'Unlimited Inodes', 'Неограничени бази'],
            'footer'  => 'Можеш да имаш хиляди продукти и снимки без притеснение.'
        ]
    ],
    [
        'id'      => 'daily-backup',
        'title'     => 'Daily Backup',
        'content'   => 'Връщане назад във времето само с един клик. Вашите данни са в безопасност всеки ден.',
        'icon'      => 'fa-clock-rotate-left',
        'color'     => 'emerald',
        'features'  => ['30-дневен Архив', 'Off-site Storage'],
        'popup'     => [
            'title'   => 'Ежедневно Архивиране (Backup)',
            'content' => 'Съхраняваме пълни копия на файловете и базата данни на отдалечени сървъри.',
            'items'   => ['30-дневен архив', 'One-click Recovery'],
            'footer'  => 'Държим архивите ти на отделно физическо място за максимална защита.'
        ]
    ],
];
?>

<section x-data="{}" class="relative py-24 bg-slate-50 dark:bg-[#0b1120] overflow-hidden">
    <div class="container mx-auto px-4 relative z-10">

        <?php ob_start();
        foreach ($services as $s):
            $color = $s['color'] ?? 'indigo';
            $theme = $colorMapper[$color] ?? $colorMapper['indigo'];
            $hoverClass = $hoverGradients[$color] ?? $hoverGradients['indigo'];
        ?>
            <div class="swiper-slide h-auto p-4">
                <div @click="$dispatch('open-popup-<?= $s['id'] ?>')"
                    class="group h-full p-8 rounded-[2.5rem] border bg-white dark:bg-slate-900 border-slate-100 dark:border-white/5 hover:border-<?= $color ?>-500/30 transition-all duration-500 shadow-xl cursor-pointer flex flex-col">

                    <div class="relative w-16 h-16 mb-8 mx-auto">
                        <div class="absolute inset-0 bg-<?= $color ?>-500/20 rounded-2xl rotate-12 group-hover:rotate-45 transition-transform duration-500"></div>
                        <div class="absolute inset-0 bg-linear-to-tr from-<?= $color ?>-600 to-<?= $color ?>-400 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-<?= $color ?>-500/30">
                            <i class="fa-solid <?= $s['icon'] ?> text-2xl"></i>
                        </div>
                    </div>

                    <h3 class="text-center text-xl font-black text-slate-900 dark:text-white uppercase italic mb-4 leading-tight"><?= $s['title'] ?></h3>
                    <p class="text-center text-slate-500 dark:text-slate-400 flex-1 mb-8"><?= $s['content'] ?></p>

                    <?php if (!empty($s['features'])): ?>
                        <ul class="space-y-3 mb-8 pt-6 border-t border-slate-100 dark:border-white/5">
                            <?php foreach ($s['features'] as $feature): ?>
                                <li class="flex items-center gap-3 font-semibold dark:text-slate-300 uppercase">
                                    <i class="fa-solid fa-check text-<?= $color ?>-500"></i> <?= $feature ?>
                                </li>
                            <?php endforeach; ?>
                        </ul>
                    <?php endif; ?>

                    <div class="inline-flex items-center gap-2 text-<?= $color ?>-500 font-bold uppercase">
                        Детайли <i class="fa-solid fa-arrow-right-long group-hover:translate-x-2 transition-transform"></i>
                    </div>
                </div>
            </div>
        <?php
        endforeach;
        $slides_content = ob_get_clean(); ?>

        <?php View::component('slider', 'partials', [
            'id' => 'services_carousel',
            'bulletColor' => 'indigo',
            'slot' => $slides_content
        ]); ?>

    </div>
</section>

<?php foreach ($services as $s): ?>
    <div x-data="{}">
        <template x-teleport="body">
            <?php View::component('popup', 'partials', [
                'id'          => $s['id'],
                'color'       => $s['color'],
                'title'       => $s['popup']['title'],
                'content'     => $s['popup']['content'],
                'examples'    => $s['popup']['items'] ?? [],
                'info_footer' => $s['popup']['footer']
            ]); ?>
        </template>
    </div>
<?php endforeach; ?>
