<?php

use App\Core\Session;

$flashError   = Session::getFlash('error');
$flashSuccess = Session::getFlash('success');
$flashInfo    = Session::getFlash('info');
?>

<?php if ($flashError): ?>
    <div class="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800/50 text-sm flex items-center">
        <i class="fa-solid fa-circle-exclamation mr-2"></i>
        <span><?= htmlspecialchars($flashError) ?></span>
    </div>
<?php endif; ?>

<?php if ($flashSuccess): ?>
    <div class="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50 text-sm flex items-center">
        <i class="fa-solid fa-circle-check mr-2"></i>
        <span><?= htmlspecialchars($flashSuccess) ?></span>
    </div>
<?php endif; ?>

<?php if ($flashInfo): ?>
    <div class="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50 text-sm flex items-center">
        <i class="fa-solid fa-circle-info mr-2"></i>
        <span><?= htmlspecialchars($flashInfo) ?></span>
    </div>
<?php endif; ?>