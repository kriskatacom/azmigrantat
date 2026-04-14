<?php

use App\Core\Session; ?>
<div style="display:none; position:absolute; left:-9999px;" aria-hidden="true">
    <input type="text" name="hp_website_url" tabindex="-1" autocomplete="off">
</div>

<input type="hidden" name="form_load_time" value="<?= time() ?>">

<input type="hidden" name="csrf_token" value="<?= Session::csrfToken() ?>">