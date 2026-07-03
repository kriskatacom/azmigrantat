<?php
$label = $text ?? 'СЪЗДАЙ ПРОФИЛ';
$iconName = $icon ?? null;
$selectedVariant = $variant ?? 'blue';
$customClass = $class ?? '';
$uniqueId = 'btn_' . bin2hex(random_bytes(4));

$variants = [
    'blue' => 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 focus:ring-blue-500',
    'indigo' => 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20 focus:ring-indigo-500',
    'emerald' => 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 focus:ring-emerald-500',
];

$variantClasses = $variants[$selectedVariant] ?? $variants['blue'];
?>

<button type="submit"
    id="<?= $uniqueId ?>"
    class="mb-0 w-full flex justify-center items-center py-3 px-4 rounded-xl shadow-lg text-base font-bold text-white transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 <?= $variantClasses ?> <?= $customClass ?>">

    <span class="btn-text flex items-center gap-2">
        <?= $label ?>
        <?php if ($iconName): ?>
            <i class="fa-solid <?= $iconName ?> transition-transform group-hover:translate-x-1"></i>
        <?php endif; ?>
    </span>

    <svg class="btn-spinner hidden animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
</button>

<script>
    (function() {
        const btn = document.getElementById('<?= $uniqueId ?>');
        const form = btn.closest('form');

        if (form) {
            form.addEventListener('submit', function(e) {
                if (!form.checkValidity()) return;

                const text = btn.querySelector('.btn-text');
                const spinner = btn.querySelector('.btn-spinner');

                btn.disabled = true;
                if (text) text.classList.add('hidden');
                if (spinner) spinner.classList.remove('hidden');
            });
        }
    })();
</script>