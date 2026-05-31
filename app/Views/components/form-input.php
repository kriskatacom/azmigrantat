<?php

/**
 * Компонент за форма - поддържа input, select и textarea.
 * Данните идват директно от View::component() чрез extract().
 */

// Инициализираме променливите от подадения масив или задаваме дефолтни
$label       = $label ?? '';
$name        = $name ?? '';
$type        = $type ?? 'text';
$required    = ($required ?? false) ? 'required' : '';
$placeholder = $placeholder ?? '';
$value       = $value ?? '';
$options     = $options ?? []; // Важно за select
$rows        = $rows ?? 3;     // Важно за textarea

$baseClasses = "block w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent transition-all outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500";
?>

<div class="w-full">
    <?php if ($label): ?>
        <label for="<?= $name ?>" class="block text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">
            <?= htmlspecialchars($label) ?>
        </label>
    <?php endif; ?>

    <?php if ($type === 'select'): ?>
        <select id="<?= $name ?>" name="<?= $name ?>" class="<?= $baseClasses ?>" <?= $required ?>>
            <option value=""><?= htmlspecialchars($placeholder ?: 'Изберете...') ?></option>
            <?php foreach ($options as $val => $text): ?>
                <option value="<?= $val ?>" <?= $value == $val ? 'selected' : '' ?>>
                    <?= htmlspecialchars($text) ?>
                </option>
            <?php endforeach; ?>
        </select>

    <?php elseif ($type === 'textarea'): ?>
        <textarea id="<?= $name ?>" name="<?= $name ?>" rows="<?= $rows ?>"
            placeholder="<?= htmlspecialchars($placeholder) ?>"
            class="<?= $baseClasses ?>" <?= $required ?>><?= htmlspecialchars($value) ?></textarea>

    <?php else: ?>
        <input id="<?= $name ?>" name="<?= $name ?>" type="<?= $type ?>"
            value="<?= htmlspecialchars($value) ?>"
            placeholder="<?= htmlspecialchars($placeholder) ?>"
            class="<?= $baseClasses ?>" <?= $required ?>>
    <?php endif; ?>
</div>