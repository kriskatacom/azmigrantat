<?php

use App\Core\Session;

$alerts = [
    'error'   => ['icon' => 'fa-circle-exclamation', 'color' => 'red', 'bg' => 'bg-red-50', 'text' => 'text-red-700', 'border' => 'border-red-200'],
    'success' => ['icon' => 'fa-circle-check', 'color' => 'emerald', 'bg' => 'bg-emerald-50', 'text' => 'text-emerald-700', 'border' => 'border-emerald-200'],
    'info'    => ['icon' => 'fa-circle-info', 'color' => 'blue', 'bg' => 'bg-blue-50', 'text' => 'text-blue-700', 'border' => 'border-blue-200'],
];
?>


<?php if ($alerts): ?>
    <div class="space-y-2">
        <?php foreach ($alerts as $type => $style): ?>
            <?php $msg = Session::getFlash($type); ?>
            <?php if ($msg): ?>
                <div id="alert-<?= $type ?>"
                    class="mb-5 flex items-center justify-between p-4 rounded-xl border <?= $style['bg'] ?> <?= $style['border'] ?> <?= $style['text'] ?> shadow-sm animate-in fade-in slide-in-from-top-2 duration-300"
                    role="alert">

                    <div class="flex items-center">
                        <div class="shrink-0">
                            <i class="fa-solid <?= $style['icon'] ?> text-lg"></i>
                        </div>
                        <div class="ml-3 text-sm font-medium">
                            <?= htmlspecialchars($msg) ?>
                        </div>
                    </div>

                    <button type="button"
                        onclick="document.getElementById('alert-<?= $type ?>').remove()"
                        class="ml-auto -mx-1.5 -my-1.5 p-1.5 inline-flex h-8 w-8 rounded-lg focus:ring-2 focus:ring-offset-1 transition-all hover:bg-white/50">
                        <i class="fa-solid fa-xmark text-sm opacity-50 hover:opacity-100"></i>
                    </button>
                </div>
            <?php endif; ?>
        <?php endforeach; ?>
    </div>
    <script>
        setTimeout(() => {
            const successAlert = document.getElementById('alert-success');
            if (successAlert) {
                successAlert.classList.add('opacity-0', 'transition-opacity', 'duration-500');
                setTimeout(() => successAlert.remove(), 500);
            }
        }, 5000);
    </script>
<?php endif; ?>