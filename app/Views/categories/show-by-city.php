<?php

use App\Core\View;
use App\Services\HelperService;

$breadcrumbs = [];
$breadcrumbs[] = [
    'label' => $city->getTranslatedName(),
    'url' => '/cities/' . ltrim($city->slug, '/')
];

$categoryPath = [];
$current = $category;
while ($current->parent_id !== null && $current->parent) {
    $current = $current->parent;
    array_unshift($categoryPath, $current);
}

$runningPath = '';
foreach ($categoryPath as $cat) {
    $runningPath .= '/' . ltrim($cat->slug, '/');
    $breadcrumbs[] = [
        'label' => $cat->getTranslatedName(),
        'url'   => '/cities/' . ltrim($city->slug, '/') . '/categories' . $runningPath
    ];
}

$breadcrumbs[] = ['label' => $category->getTranslatedName(), 'url' => ''];

View::component('hero-section', 'components', [
    'title'       => $category->getTranslatedName() . ' в ' . $city->getTranslatedName(),
    'breadcrumbs' => $breadcrumbs,
    'images'      => [
        'phone'   => $category->options['image_phone'] ?? null,
        'tablet'  => $category->options['image_tablet'] ?? null,
        'desktop' => $category->image_url ?? '/assets/img/default-city.jpg',
    ]
]);
?>

<?php if (!empty($ads) && $ads->count() > 0): ?>
    <div class="container mx-auto pt-10">
        <div class="ads-marquee-wrapper mb-5 overflow-hidden relative">
            <div id="adsTrack" class="flex transition-transform ease-in-out">
                <?php
                $displayAds = $ads->count() < 5 ? $ads->merge($ads) : $ads;
                foreach ($displayAds as $ad):
                    $adImage = $ad->options['image_desktop'] ?? '/assets/images/no-image.png';
                ?>
                    <div class="ad-item flex-none w-full md:w-1/2 lg:w-1/3 2xl:w-1/4 px-3">
                        <div class="relative h-56 md:h-64 rounded-2xl overflow-hidden shadow-md group border border-white">

                            <img src="<?= HelperService::getImage($adImage) ?>"
                                class="lightbox-trigger w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 cursor-zoom-in"
                                alt="<?= htmlspecialchars($ad->title) ?>"
                                data-src="<?= HelperService::getImage($adImage) ?>">

                            <div class="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent pointer-events-none"></div>

                            <div class="absolute bottom-0 left-0 p-5 text-white w-full pointer-events-none">
                                <h3 class="text-xl font-bold truncate"><?= htmlspecialchars($ad->title) ?></h3>

                                <?php if ($ad->options['link_url'] ?? null): ?>
                                    <a href="<?= $ad->options['link_url'] ?>"
                                        target="_blank"
                                        class="inline-block mt-2 text-xs bg-white/20 hover:bg-white/40 backdrop-blur-md px-3 py-1 rounded-lg transition-all pointer-events-auto">
                                        <?= htmlspecialchars($ad->options['button_text'] ?? 'Отиди на сайта') ?>
                                        <i class="fa-solid fa-external-link ml-1 text-[10px]"></i>
                                    </a>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
    </div>
<?php endif; ?>

<?php $gridItems = [];
foreach ($items as $item) {
    if ($showCompanies) {
        $url = "/cities/" . ltrim($city->slug, '/') . "/categories/" . ltrim($category->slug, '/') . "/company/" . ltrim($item->slug, '/');
    } else {
        $url = "/cities/" . ltrim($city->slug, '/') . "/categories/" . ltrim($category->slug, '/') . "/" . ltrim($item->slug, '/');
    }

    $gridItems[] = [
        'url'   => $url,
        'name'  => $item->name,
        'image' => $item->image_url ?? $item['options']['image_url'] ?? $item->options['image_desktop'] ?? '/assets/images/no-image.png',
        'label' => HelperService::trans('information')
    ];
}

View::component('card-grid', 'components', [
    'title'          => $showCompanies ? HelperService::trans('companies_in') : HelperService::trans('subcategories_in'),
    'highlightTitle' => $category->getTranslatedName(),
    'items'          => $gridItems,
    'emptyTitle'     => "Няма намерени резултати",
]);
?>

<script>
    document.addEventListener('DOMContentLoaded', function() {
        const track = document.getElementById('adsTrack');
        if (!track) return;

        let position = 0;
        let direction = -1;
        let speed = 0.5;
        let isPaused = false;

        track.addEventListener('mouseenter', () => isPaused = true);
        track.addEventListener('mouseleave', () => isPaused = false);

        function animate() {
            if (!isPaused) {
                const maxScroll = track.scrollWidth - track.parentElement.offsetWidth;

                if (maxScroll <= 0) return;

                position += speed * direction;

                if (position <= -maxScroll) {
                    direction = 1;
                } else if (position >= 0) {
                    direction = -1;
                }

                track.style.transform = `translateX(${position}px)`;
            }
            requestAnimationFrame(animate);
        }

        window.addEventListener('resize', () => {
            position = 0;
            track.style.transform = `translateX(0px)`;
        });

        animate();
    });
</script>

<style>
    .ads-marquee-container {
        width: 100%;
        white-space: nowrap;
    }

    .ads-track {
        display: flex;
        width: max-content;
        animation: marquee-move 40s linear infinite alternate;
    }

    .ads-marquee-container:hover .ads-track {
        animation-play-state: paused;
    }

    @keyframes marquee-move {
        0% {
            transform: translateX(0);
        }

        100% {
            transform: translateX(calc(-100% + 100vw));
        }
    }

    @media (max-width: 768px) {
        .ads-track {
            animation-duration: 20s;
        }
    }
</style>