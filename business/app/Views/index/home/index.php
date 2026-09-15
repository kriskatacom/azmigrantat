<?php

use App\Core\View; ?>

<?php View::component('hero', 'index/home/components', ['page' => $page]); ?>
<?php View::component('map', 'index/home/components'); ?>
