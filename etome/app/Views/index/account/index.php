<?php

use App\Core\View;
?>

<div class="max-w-4xl mx-auto pb-10" x-data="profileAccountComponent('<?= htmlspecialchars($account['email'] ?? '') ?>')">
    <div class="relative bg-white dark:bg-gray-950">

        <?php View::component('header', 'index/account/components', [
            'account' => $account ?? [],
        ]); ?>
        
        <?php View::component('personal-data', 'index/account/components', [
            'account' => $account ?? [],
        ]); ?>

        <?php View::component('company-data', 'index/account/components', [
            'user_id' => $account['id'] ?? 0,
        ]); ?>

        <?php View::component('videos', 'index/account/components', [
            'videos' => $videos ?? [],
        ]); ?>

    </div>
</div>

<script>
document.addEventListener('alpine:init', () => {
    Alpine.data('profileAccountComponent', (initialEmail) => ({
        email: initialEmail,

        copyToClipboard() {
            if (!this.email) return;
            
            navigator.clipboard.writeText(this.email).then(() => {
                alert('Имейлът е копиран!');
            }).catch(err => {
                console.error('Грешка при копиране: ', err);
            });
        }
    }));
});
</script>
