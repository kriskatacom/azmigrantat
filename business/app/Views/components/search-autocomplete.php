<?php
$placeholder = $placeholder ?? "Търси дестинация...";
$action = $action ?? "/cities/search";
$method = "GET";
?>

<form action="<?= $action ?>" method="<?= $method ?>" class="w-full max-w-2xl mx-auto my-5 relative group">
    <div class="absolute -inset-1 bg-blue-500/10 rounded-3xl blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>

    <div class="relative w-full flex items-center bg-white border border-slate-200 rounded-2xl shadow-[0_15px_40px_-15px_rgba(0,0,0,0.1)] transition-all duration-300 group-hover:border-slate-300 group-focus-within:border-blue-500 group-focus-within:shadow-[0_20px_50px_-20px_rgba(59,130,246,0.2)]">

        <div class="pl-6 text-slate-400 group-focus-within:text-blue-500 transition-colors duration-300 shrink-0">
            <?php \App\Services\HelperService::icon('fa-search', 'w-5 h-5'); ?>
        </div>

        <input type="text"
            name="q"
            class="flex-1 bg-transparent border-none py-2 px-4 text-slate-900 placeholder:text-slate-400 focus:ring-0 text-lg md:text-xl outline-none font-medium tracking-tight"
            placeholder="<?= htmlspecialchars($placeholder) ?>"
            value="<?= htmlspecialchars($_GET['q'] ?? '') ?>"
            required>

        <div class="pr-2">
            <button type="submit"
                class="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/20">
                <span class="hidden md:inline">Търси</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </button>
        </div>
    </div>
</form>
