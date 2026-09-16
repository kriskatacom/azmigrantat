<?php

use App\Core\View;
?>

<div>
    <h1 class="text-xl font-semibold text-gray-900 dark:text-white text-center mt-2 md:mt-5"><?= $title ?></h1>
    <?php View::component('search', 'index/components'); ?>
</div>
