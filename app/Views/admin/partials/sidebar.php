<?php
$is_open = $_SESSION['sidebar_open'] ?? true;
?>

<div id="sidebar-backdrop"
    onclick="toggleSidebar()"
    class="<?= $is_open ? '' : 'hidden' ?> fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300">
</div>

<aside id="main-sidebar"
    class="fixed inset-y-0 left-0 w-10/12 md:w-80 bg-black text-white z-50 transform shadow-2xl transition-transform duration-300 ease-in-out <?= $is_open ? 'translate-x-0' : '-translate-x-full' ?>">

    <div class="p-5 flex items-center justify-between">
        <div class="flex flex-col justify-center items-center mx-auto">
            <span class="text-xl md:text-2xl font-black uppercase text-secondary"><?= htmlspecialchars(COMPANY_NAME) ?></span>
            <span class="text-sm text-gray-400"><?= htmlspecialchars(WEBSITE_DOMAIN_NAME) ?></span>
        </div>
        <button onclick="toggleSidebar()" class="lg:hidden fixed top-5 right-5 flex justify-center items-center rounded-md w-12 h-12 bg-gray-800 hover:bg-gray-900 text-slate-400">
            <i class="fa-solid fa-xmark text-2xl"></i>
        </button>
    </div>

    <hr class="border-t border-gray-700" />

    <nav class="space-y-2 flex-1 text-lg mt-5">
        <?php $current_admin_page = $_SERVER['REQUEST_URI']; ?>

        <div class="px-5 space-y-2">
            <?php foreach (SIDEBAR_LINKS as $link): ?>
                <?php $is_active = str_starts_with($current_admin_page, $link['url']); ?>
                <a href="<?= $link['url'] ?>"
                    onclick="handleSidebarLink(event, '<?= $link['url'] ?>')"
                    class="flex items-center gap-3 px-4 py-3 rounded-md font-semibold transition-all <?= $is_active ? 'bg-primary text-white' : 'text-slate-400 hover:bg-primary hover:text-white' ?>">
                    <i class="fa-solid <?= $link['icon'] ?> text-2xl w-7"></i> <?= $link['label'] ?>
                </a>
            <?php endforeach; ?>
        </div>

        <hr class="border-t border-gray-700" />

        <div class="px-5">
            <form action="/users/logout" method="POST">
                <button type="submit"
                    class="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all group">
                    <i class="fa-solid fa-power-off w-5 group-hover:scale-110 transition-transform"></i>
                    <span class="font-medium">Изход</span>
                </button>
            </form>
        </div>
    </nav>
</aside>

<script>
    function handleSidebarLink(event, url) {
        if (window.innerWidth < 1024) {
            event.preventDefault();
            toggleSidebar();
            setTimeout(() => {
                window.location.href = url;
            }, 300);
        }
    }
</script>
