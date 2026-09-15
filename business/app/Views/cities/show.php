<?php

use App\Core\View;
use App\Services\HelperService;

$breadcrumbs = [];
if ($city->parent_id && isset($city->parent)) {
    $breadcrumbs[] = ['label' => $city->parent->getTranslatedName(), 'url' => '/cities/' . ltrim($city->parent->slug, '/')];
}
$breadcrumbs[] = ['label' => $city->getTranslatedName(), 'url' => ''];

View::component('hero-section', 'components', [
    'title'       => $city->name,
    'breadcrumbs' => $breadcrumbs,
    'images'      => [
        'phone'   => $city->options['image_phone'] ?? null,
        'tablet'  => $city->options['image_tablet'] ?? null,
        'desktop' => $city->options['image_desktop'] ?? null,
    ]
]);

$gridItems = [];
if (count($children) > 0) {
    $gridTitle = 'Села в община ';
    $gridHighlight = $city->name;
    foreach ($children as $child) {
        $gridItems[] = [
            'url'   => '/cities/' . ltrim($child->slug, '/'),
            'name'  => $child->name,
            'image' => $child->options['image_desktop'] ?? null,
            'label' => HelperService::trans('information')
        ];
    }
} elseif (isset($categories) && count($categories) > 0) {
    $gridTitle = HelperService::trans('business_partnership') . ' - ';
    $gridHighlight = $city->getTranslatedName();
    foreach ($categories as $cat) {
        $gridItems[] = [
            'url'   => '/cities/' . ltrim($city->slug, '/') . '/categories/' . ltrim($cat->slug, '/'),
            'name'  => $cat->name,
            'image' => $cat->image_url ?? null,
            'label' => HelperService::trans('information')
        ];
    }
}

if (!empty($gridItems)) {
    View::component('card-grid', 'components', [
        'title' => $gridTitle,
        'highlightTitle' => $gridHighlight,
        'items' => $gridItems
    ]);
}
