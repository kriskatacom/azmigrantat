<?php

use App\Core\View;

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

$gridItems = [];
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
        'label' => $showCompanies ? 'Виж профила' : 'Разгледай'
    ];
}

View::component('card-grid', 'components', [
    'title'          => $showCompanies ? 'Фирми в ' : 'Подкатегории в ',
    'highlightTitle' => $category->getTranslatedName(),
    'items'          => $gridItems,
    'emptyTitle'     => $showCompanies ? "Няма намерени фирми" : "Няма намерени подкатегории",
]);