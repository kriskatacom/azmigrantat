<?php
$safeId = 'select2-' . str_replace(['[', ']'], '-', $name) . '-' . uniqid();
$isMultiple = isset($multiple) && $multiple;
$selectedValues = is_array($value) ? $value : [$value];
?>

<div class="w-full space-y-1.5"
    x-data="select2Component(<?= htmlspecialchars(json_encode($isMultiple ? $selectedValues : ($value ?? ''))) ?>)">

    <?php if (isset($label) && $label): ?>
        <label class="block text-sm font-semibold text-slate-700" for="<?= $safeId ?>">
            <?= $label ?>
        </label>
    <?php endif; ?>

    <select id="<?= $safeId ?>" name="<?= $name ?><?= $isMultiple ? '[]' : '' ?>"
        class="w-full h-10 rounded-lg border-slate-200" <?= $isMultiple ? 'multiple' : '' ?> <?= isset($required) && $required ? 'required' : '' ?>>

        <?php if (!$isMultiple): ?>
            <option value="">
                <?= $placeholder ?? 'Изберете опция...' ?>
            </option>
        <?php endif; ?>

        <?php foreach ($options as $id => $title): ?>
            <option value="<?= $id ?>" <?= in_array((string) $id, array_map('strval', $selectedValues)) ? 'selected' : '' ?>>
                <?= htmlspecialchars($title) ?>
            </option>
        <?php endforeach; ?>
    </select>

    <?php if (isset($help) && $help): ?>
        <p class="text-xs text-slate-400 italic mt-1">
            <?= $help ?>
        </p>
    <?php endif; ?>
</div>

<link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />

<script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>

<script>
    function select2Component(initialValue) {
        return {
            selectedValue: initialValue,

            init() {
                this.$nextTick(() => {
                    const $el = $('#<?= $safeId ?>');

                    $el.select2({
                        width: '100%',
                        placeholder: '<?= $placeholder ?? 'Изберете опция...' ?>',
                        allowClear: <?= isset($allowClear) && $allowClear ? 'true' : 'false' ?>
                    });

                    $el.on('change', () => {
                        this.selectedValue = $el.val();
                    });

                    this.$watch('selectedValue', value => {
                        if (JSON.stringify($el.val()) !== JSON.stringify(value)) {
                            $el.val(value).trigger('change.select2');
                        }
                    });
                });
            }
        }
    }
</script>

<style>
    .select2-container--default .select2-selection--single {
        height: 42px !important;
        border-color: #e2e8f0 !important;
        border-radius: 0.5rem !important;
        display: flex !important;
        align-items: center !important;
    }

    .select2-container--default .select2-selection--single .select2-selection__arrow {
        height: 40px !important;
    }

    .select2-container--default .select2-selection--multiple {
        min-height: 42px !important;
        border-color: #e2e8f0 !important;
        border-radius: 0.5rem !important;
        padding-bottom: 3px !important;
    }

    .select2-container--default .select2-selection--multiple .select2-selection__choice {
        background-color: #f1f5f9 !important;
        border: 1px solid #cbd5e1 !important;
        border-radius: 0.375rem !important;
        padding: 2px 8px !important;
        color: #334155 !important;
        font-size: 0.875rem !important;
    }

    .select2-container--default .select2-selection--multiple .select2-selection__choice__display {
        padding-left: 4px !important;
    }

    .select2-dropdown {
        border-color: #e2e8f0 !important;
        border-radius: 0.5rem !important;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1) !important;
        z-index: 60 !important;
    }
</style>