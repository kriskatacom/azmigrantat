<?php

use App\Core\View;
?>

<?php View::component('header', 'index/categories/components', [
    'parentCategory' => $parentCategory ?? null,
    'breadcrumbs' => $breadcrumbs ?? []
]); ?>

<?php View::component('categories', 'index/categories/components', [
    'categories' => $categories ?? []
]); ?>
