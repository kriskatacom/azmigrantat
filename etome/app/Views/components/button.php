<?php
$url = $link ?? '#';
$label = $text ?? 'Свържи се с мен';
$iconName = $icon ?? null;
$selectedVariant = $variant ?? 'primary';

$variants = [
    'primary'   => 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20',
    'outline'   => 'bg-transparent border-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white',
    'ghost'     => 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 shadow-none',
    'dark'      => 'bg-slate-900 text-white hover:bg-black shadow-black/20',
    'success'   => 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20',
];

$variantClasses = $variants[$selectedVariant] ?? $variants['primary'];
?>

<a href="<?= $url ?>" 
   class="group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold uppercase transition-all duration-300 active:scale-95 shadow-lg <?= $variantClasses ?> <?= $class ?? '' ?>">
    
    <span><?= $label ?></span>

    <?php if ($iconName): ?>
        <i class="fa-solid <?= $iconName ?> transition-transform group-hover:translate-x-1"></i>
    <?php endif; ?>
</a>