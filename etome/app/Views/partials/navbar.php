<?php

use App\Core\Auth;
?>

<div class="bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800">
    <nav x-data="navbarComponent()" x-init="init()"
        class="container mx-auto px-2 py-3 flex justify-between items-center sticky z-50 <?= Auth::isAdmin() ? 'top-10' : 'top-0' ?>">
        <div class="text-2xl font-bold">
            <a href="/">
                <span class="dark:text-white text-primary">Etome</span><span class="text-blue-600">.bg</span>
            </a>
        </div>

        <div class="flex items-center gap-3">
            <div class="scale-90 border-r border-gray-100 dark:border-slate-800 pr-6">
                <div class="flex items-center gap-3">
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" x-model="darkMode" class="sr-only peer">
                        <div
                            class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 shadow-inner">
                        </div>
                        <span
                            class="ml-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            <span x-show="!darkMode" x-cloak>Светла</span>
                            <span x-show="darkMode" x-cloak>Тъмна</span>
                        </span>
                    </label>
                </div>
            </div>

            <div class="relative" @click.away="appsMenuOpen = false">
                <button @click="appsMenuOpen = !appsMenuOpen"
                    class="w-10 h-10 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors focus:outline-none"
                    title="Нашите сайтове">
                    <i class="fa-solid fa-table-cells text-lg transition-transform duration-200"
                        :class="appsMenuOpen ? 'rotate-90 text-blue-600' : ''"></i>
                </button>

                <div x-show="appsMenuOpen" x-transition:enter="transition ease-out duration-100"
                    x-transition:enter-start="transform opacity-0 scale-95"
                    x-transition:enter-end="transform opacity-100 scale-100"
                    x-transition:leave="transition ease-in duration-75"
                    x-transition:leave-start="transform opacity-100 scale-100"
                    x-transition:leave-end="transform opacity-0 scale-95"
                    class="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden z-50"
                    x-cloak>
                    <div class="p-3 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-800/80">
                        <span
                            class="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block px-2">Нашите
                            проекти</span>
                    </div>

                    <div class="p-2 grid grid-cols-1 gap-1">
                        <a href="https://azmigrantat.com" target="_blank"
                            class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors group">
                            <div
                                class="w-9 h-9 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center shrink-0 border border-blue-100/50 dark:border-blue-900/30">
                                <i class="fa-solid fa-house-chimney text-sm"></i>
                            </div>
                            <div>
                                <div
                                    class="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    Аз, Мигрантът</div>
                                <div class="text-xs text-gray-400 dark:text-gray-500">Основна платформа и
                                    полезна информация</div>
                            </div>
                        </a>

                        <a href="https://business.azmigrantat.com" target="_blank"
                            class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors group">
                            <div
                                class="w-9 h-9 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center shrink-0 border border-emerald-100/50 dark:border-emerald-900/30">
                                <i class="fa-solid fa-briefcase text-sm"></i>
                            </div>
                            <div>
                                <div
                                    class="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                    Бизнес каталог</div>
                                <div class="text-xs text-gray-400 dark:text-gray-500">Фирми, услуги, обяви
                                    и дейности</div>
                            </div>
                        </a>

                        <a href="https://gradove-i-sela.azmigrantat.com" target="_blank"
                            class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors group">
                            <div
                                class="w-9 h-9 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center shrink-0 border border-amber-100/50 dark:border-amber-900/30">
                                <i class="fa-solid fa-mountain-city text-sm"></i>
                            </div>
                            <div>
                                <div
                                    class="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                    Градове и села</div>
                                <div class="text-xs text-gray-400 dark:text-gray-500">Списък на населените
                                    места по региони</div>
                            </div>
                        </a>
                    </div>
                </div>
            </div>

            <a href="/search"
                class="w-10 h-10 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                title="Търсене">
                <i class="fa-solid fa-magnifying-glass"></i>
            </a>
        </div>
    </nav>
</div>

<script>
    function navbarComponent() {
        return {
            mobileMenuOpen: false,
            appsMenuOpen: false,
            openDropdown: null,
            scrolled: false,
            darkMode: localStorage.getItem('theme') === 'dark' ||
                (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches),

            init() {
                if (this.darkMode) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }

                this.$watch('darkMode', val => {
                    if (val) {
                        document.documentElement.classList.add('dark');
                        localStorage.setItem('theme', 'dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                        localStorage.setItem('theme', 'light');
                    }
                });
            },
        }
    }
</script>
