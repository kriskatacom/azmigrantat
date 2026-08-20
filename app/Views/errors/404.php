<div class="min-h-[70vh] flex items-center justify-center px-6">
    <div class="text-center">
        <div class="relative mb-8">
            <div class="text-9xl font-black text-slate-100 select-none">404</div>
            <div class="absolute inset-0 flex items-center justify-center">
                <div class="w-20 h-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center rotate-12 animate-bounce">
                    <i class="fa-solid fa-map-location-dot text-3xl"></i>
                </div>
            </div>
        </div>

        <h1 class="text-3xl font-bold text-slate-900 mb-3">Оппс! Страницата е изгубена.</h1>
        <p class="text-slate-500 max-w-md mx-auto mb-10">
            Изглежда, че линкът, който сте последвали, е счупен или страницата е била преместена.
            Не се притеснявайте, ето няколко полезни пътя:
        </p>

        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="/" class="px-8 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
                <i class="fa-solid fa-house-chimney text-sm"></i>
                Начало
            </a>

            <button onclick="history.back()" class="px-8 py-3 bg-white text-slate-600 font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2">
                <i class="fa-solid fa-arrow-left text-sm"></i>
                Назад
            </button>
        </div>

        <div class="mt-12 pt-8 border-t border-slate-100">
            <p class="text-xs text-slate-400 uppercase tracking-widest font-bold mb-4">Популярни дестинации</p>
            <div class="flex flex-wrap justify-center gap-6 text-sm font-medium text-slate-500">
                <a href="/services" class="hover:text-primary transition-colors">Услуги</a>
                <a href="/portfolio" class="hover:text-primary transition-colors">Портфолио</a>
                <a href="/contacts" class="hover:text-primary transition-colors">Контакти</a>
            </div>
        </div>
    </div>
</div>
