<?php

use App\Services\HelperService;

$id = $id ?? 'modal-' . uniqid();
$confirmText = $confirmText ?? HelperService::trans('confirm');
$cancelText = $cancelText ?? HelperService::trans('cancel');
?>

<div
    x-on:open-modal-<?= $id ?>.window="isOpen = true"
    x-on:close-modal-<?= $id ?>.window="isOpen = false"
    x-on:keydown.escape.window="isOpen = false"
    class="relative z-50">
    <div
        x-show="isOpen"
        x-transition:enter="transition ease-out duration-300"
        x-transition:enter-start="opacity-0"
        x-transition:enter-end="opacity-100"
        x-transition:leave="transition ease-in duration-200"
        x-transition:leave-start="opacity-100"
        x-transition:leave-end="opacity-0"
        class="fixed inset-0 bg-gray-900/40 bg-opacity-50 backdrop-blur-sm"></div>

    <div
        x-cloak
        x-show="isOpen"
        x-transition:enter="transition ease-out duration-300"
        x-transition:enter-start="opacity-0 scale-95"
        x-transition:enter-end="opacity-100 scale-100"
        x-transition:leave="transition ease-in duration-200"
        x-transition:leave-start="opacity-100 scale-100"
        x-transition:leave-end="opacity-0 scale-95"
        class="fixed inset-0 flex items-center justify-center p-4">
        <div
            @click.away="isOpen = false"
            class="bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 class="text-lg font-semibold text-gray-800">
                    <?= htmlspecialchars($title) ?>
                </h3>
                <button @click="isOpen = false" class="text-gray-400 hover:text-gray-600">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>

            <div class="wysiwyg-text px-6 py-4 text-gray-600 overflow-auto max-h-100">
                <?= $content ?>
            </div>

            <div class="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
                <button
                    @click="isOpen = false"
                    class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-md transition">
                    <?= htmlspecialchars($cancelText) ?>
                </button>
                <?php if (!empty($onConfirm)): ?>
                    <button
                        @click="<?= $onConfirm ?>; isOpen = false"
                        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition shadow-sm">
                        <?= htmlspecialchars($confirmText) ?>
                    </button>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>
