<div x-show="sidebarOpen" x-cloak class="fixed inset-0 flex justify-end z-9999">
    <div @click="sidebarOpen = false" class="fixed top-0 left-0 w-full h-screen bg-black/20" x-show="sidebarOpen"
        x-transition:enter="transition ease-out duration-300" x-transition:enter-start="opacity-0"
        x-transition:enter-end="opacity-100" x-transition:leave="transition ease-in duration-300"
        x-transition:leave-start="opacity-100" x-transition:leave-end="opacity-0"></div>

    <div class="relative w-full h-screen max-w-100 bg-white shadow-xl flex flex-col" x-show="sidebarOpen"
        x-transition:enter="transition-transform" x-transition:enter-start="translate-x-full"
        x-transition:leave="transition-transform" x-transition:leave-end="translate-x-full">

        <div class="w-full border-b border-gray-200">
            <button @click="sidebarOpen = false" class="p-5 self-start text-slate-400 hover:text-slate-900">
                <i class="fa-solid fa-xmark text-2xl md:text-4xl"></i>
            </button>
        </div>

        <nav class="flex flex-col text-slate-700">
            <a href="/privacy" class="border-b border-gray-200 py-3 px-5 md:text-lg hover:bg-primary">Политика за
                поверителност</a>
            <a href="/cookies" class="border-b border-gray-200 py-3 px-5 md:text-lg hover:bg-primary">Политика за
                бисквитки</a>
            <a href="/terms" class="border-b border-gray-200 py-3 px-5 md:text-lg hover:bg-primary">Общи условия</a>
            <a href="/contacts" class="border-b border-gray-200 py-3 px-5 md:text-lg hover:bg-primary">Контакти</a>
            <a href="/about" class="border-b border-gray-200 py-3 px-5 md:text-lg hover:bg-primary">За нас</a>
        </nav>
    </div>
</div>