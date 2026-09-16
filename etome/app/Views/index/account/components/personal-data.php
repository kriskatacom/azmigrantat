<?php if (!empty($account['email']) || !empty($account['phone']) || !empty($account['options']['location'])): ?>
<div
    class="max-w-4xl mx-auto border-t border-gray-200 dark:border-gray-700/60 text-gray-700 dark:text-slate-200 p-2 md:p-5 mt-2 md:mt-5">
    <ul class="space-y-3">

        <?php if (!empty($account['email'])): ?>
            <li class="flex items-center gap-3">
                <i class="fa-solid fa-envelope text-gray-400 dark:text-gray-500 fa-fw text-base"></i>
                <span>
                    <strong class="font-medium text-gray-900 dark:text-white">Имейл:</strong>
                    <a href="mailto:<?= str_replace(' ', '', $account['email']) ?>"
                        class="hover:text-blue-500 dark:hover:text-primary-light transition-colors duration-150">
                        <?= htmlspecialchars($account['email']) ?>
                    </a>
                </span>
            </li>
        <?php endif; ?>

        <?php if (!empty($account['phone'])): ?>
            <li class="flex items-center gap-3">
                <i class="fa-solid fa-phone text-gray-400 dark:text-gray-500 fa-fw text-base"></i>
                <span>
                    <strong class="font-medium text-gray-900 dark:text-white">Телефон:</strong>
                    <a href="tel:<?= str_replace(' ', '', $account['phone']) ?>"
                        class="hover:text-blue-500 dark:hover:text-primary-light transition-colors duration-150">
                        <?= htmlspecialchars(format_phone($account['phone'])) ?>
                    </a>
                </span>
            </li>
        <?php endif; ?>

        <?php if (!empty($account['options']['location'])): ?>
            <li class="flex items-start gap-3">
                <i class="fa-solid fa-location-dot text-gray-400 dark:text-gray-500 fa-fw text-base mt-0.5"></i>
                <span><strong class="font-medium text-gray-900 dark:text-white">Адрес:</strong>
                    <?= htmlspecialchars($account['options']['location']) ?></span>
            </li>
        <?php endif; ?>

    </ul>
</div>
<?php endif; ?>