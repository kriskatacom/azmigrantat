<?php

use App\Core\View;
?>

<div class="p-2">
    <?php View::component('post', 'index/components', ['post' => $post]); ?>
</div>
