<?php

$id = $id ?? 'toggle-' . uniqid();
$name = $name ?? 'is_active';
$label = $label ?? 'Активен статус';
$description = $description ?? null;
$checked = ($value ?? true) ? 'checked' : '';
?>

<div class="flex items-center gap-4 py-3 px-1">
    <label for="<?= $id ?>" class="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
        <input type="checkbox" 
               name="<?= $name ?>" 
               id="<?= $id ?>" 
               value="1" 
               class="sr-only peer" 
               <?= $checked ?>>
        
        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer 
                    peer-checked:after:translate-x-full peer-checked:after:border-white 
                    after:content-[''] after:absolute after:top-0.5 after:left-0.5 
                    after:bg-white after:border-gray-300 after:border after:rounded-full 
                    after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 shadow-inner">
        </div>
    </label>

    <div class="flex flex-col select-none cursor-pointer" onclick="document.getElementById('<?= $id ?>').click()">
        <span class="text-sm font-semibold text-gray-800 leading-tight">
            <?= $label ?>
        </span>
        <?php if ($description): ?>
            <span class="text-xs text-gray-500 mt-1 leading-relaxed max-w-sm">
                <?= $description ?>
            </span>
        <?php endif; ?>
    </div>
</div>