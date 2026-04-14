<?php

use App\Core\Auth;
use App\Modules\Str;
use App\Core\View;
use App\Models\Menu;

$currentPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$mainMenu = Menu::where('slug', 'main-menu')->first();
$menuItems = $mainMenu ? $mainMenu->getTree() : [];
?>

<nav x-data="navbarComponent()"
    x-init="init()"
    @scroll.window="handleScroll()"
    class="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 sticky <?= Auth::isAdmin() ? 'top-10' : 'top-0' ?> z-50">

    <div class="container mx-auto px-4">
        <div class="flex justify-between items-center h-20">

            <div class="flex items-center gap-8">
                <a href="/" class="shrink-0">
                    <img src="/assets/images/logo.webp" alt="Logo" class="h-14 w-auto dark:hidden transition-transform duration-300" :class="scrolled ? 'scale-90' : 'scale-100'">
                    <img src="/assets/images/logo-dark-mode.webp" alt="Logo Dark" class="h-14 w-auto hidden dark:block transition-transform duration-300" :class="scrolled ? 'scale-90' : 'scale-100'">
                </a>

                <div class="hidden lg:flex items-center gap-1 text-base font-medium">
                    <?php
                    $getFullUrl = function ($link) {
                        if (!empty($link['page']['slug'])) {
                            return '/' . ltrim($link['page']['slug'], '/');
                        }
                        return $link['url'] ?? '#';
                    };

                    foreach ($menuItems as $link):
                        $linkUrl = $getFullUrl($link);
                        $isParentActive = ($currentPath === $linkUrl);
                        $hasActiveChild = false;

                        if (!empty($link['children'])) {
                            foreach ($link['children'] as $child) {
                                if ($currentPath === $getFullUrl($child)) {
                                    $hasActiveChild = true;
                                    break;
                                }
                            }
                        }

                        $activeClass = ($isParentActive || $hasActiveChild)
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400';
                    ?>

                        <?php if (empty($link['children'])): ?>
                            <a href="<?= $linkUrl ?>"
                                class="relative px-3 py-2 rounded-md transition-colors <?= $activeClass ?>"
                                target="<?= $link['target'] ?>">
                                <?= htmlspecialchars($link['title']) ?>
                                <?php if ($isParentActive): ?>
                                    <span class="absolute bottom-0 left-3 right-3 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full"></span>
                                <?php endif; ?>
                            </a>
                        <?php else: ?>
                            <div class="relative" @mouseenter="openDropdown = '<?= $link['title'] ?>'" @mouseleave="openDropdown = null">
                                <a
                                    href="<?= $linkUrl ?>"
                                    class="flex items-center gap-1 px-3 py-2 rounded-md transition-colors <?= $activeClass ?>"
                                    target="<?= $link['target'] ?>"
                                    title="<?= $link['title'] ?>">
                                    <span><?= htmlspecialchars($link['title']) ?></span>
                                    <?php if (!empty($link['children']) && count($link['children']) > 0): ?>
                                        <svg class="w-4 h-4 transition-transform" :class="openDropdown === '<?= $link['title'] ?>' ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                        </svg>
                                    <?php endif; ?>
                                </a>

                                <?php if (!empty($link['children']) && count($link['children']) > 0): ?>
                                    <div x-show="openDropdown === '<?= $link['title'] ?>'"
                                        x-cloak
                                        x-transition:enter="transition ease-out duration-150"
                                        x-transition:enter-start="opacity-0 scale-95"
                                        x-transition:enter-end="opacity-100 scale-100"
                                        class="absolute left-0 w-56 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-xl rounded-xl py-2 mt-0 z-50">

                                        <?php foreach ($link['children'] as $child):
                                            $childUrl = $getFullUrl($child);
                                            $isChildActive = ($currentPath === $childUrl);
                                        ?>
                                            <a
                                                href="<?= $childUrl ?>"
                                                class="block px-4 py-2 text-base transition-colors <?= $isChildActive ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400' ?>"
                                                target="<?= $child['target'] ?>"
                                                title="<?= $child['title'] ?>">
                                                <?= htmlspecialchars($child['title']) ?>
                                            </a>
                                        <?php endforeach; ?>
                                    </div>
                                <?php endif; ?>
                            </div>
                        <?php endif; ?>
                    <?php endforeach; ?>
                </div>
            </div>

            <div class="hidden md:flex items-center gap-6">
                <div class="scale-90 border-r border-gray-100 dark:border-slate-800 pr-6">
                    <div class="flex items-center gap-3">
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" x-model="darkMode" class="sr-only peer">
                            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 shadow-inner"></div>
                            <span class="ml-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                <span x-show="!darkMode" x-cloak>Light</span>
                                <span x-show="darkMode" x-cloak>Dark</span>
                            </span>
                        </label>
                    </div>
                </div>

                <?php if ($user = Auth::user()): ?>
                    <div class="relative" x-data="{ profileOpen: false }" @click.away="profileOpen = false">
                        <button @click="profileOpen = !profileOpen" class="flex items-center gap-3 p-1 pr-3 rounded-full hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                            <div class="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
                                <?= Str::initial($user->name) ?>
                            </div>
                            <div class="text-left hidden lg:block">
                                <p class="text-xs text-gray-500 dark:text-gray-400 leading-none">Здравей,</p>
                                <p class="text-sm font-bold text-gray-900 dark:text-white"><?= htmlspecialchars($_SESSION['user_name'] ?? 'Потребител') ?></p>
                            </div>
                            <i class="fa-solid fa-chevron-down text-xs text-gray-400 transition-transform" :class="profileOpen ? 'rotate-180' : ''"></i>
                        </button>

                        <div x-show="profileOpen"
                            x-cloak
                            x-transition:enter="transition ease-out duration-100"
                            x-transition:enter-start="opacity-0 scale-95"
                            x-transition:enter-end="opacity-100 scale-100"
                            class="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-xl rounded-xl py-2 z-50">
                            <a href="/users/profile" class="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-slate-700">
                                <i class="fa-solid fa-user-gear w-4"></i> Моят профил
                            </a>
                            <div class="h-px bg-gray-100 dark:bg-slate-700 my-1"></div>
                            <form action="/users/logout" method="POST">
                                <button type="submit" class="w-full flex items-center gap-3 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
                                    <i class="fa-solid fa-right-from-bracket w-4"></i> Изход
                                </button>
                            </form>
                        </div>
                    </div>
                <?php else: ?>
                    <?php View::component('button', 'components', [
                        'link' => '/contacts',
                        'text' => 'Направете запитване',
                        'icon' => 'fa-rocket'
                    ]); ?>
                <?php endif; ?>
            </div>

            <button @click="toggleMobileMenu()" class="md:hidden p-2 text-gray-600 dark:text-gray-400 outline-none">
                <svg x-show="!mobileMenuOpen" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path>
                </svg>
                <svg x-show="mobileMenuOpen" x-cloak class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
    </div>

    <div x-show="mobileMenuOpen"
        x-cloak
        x-transition:enter="transition ease-out duration-300"
        x-transition:enter-start="opacity-0"
        x-transition:enter-end="opacity-100"
        x-transition:leave="transition ease-in duration-200"
        x-transition:leave-start="opacity-100"
        x-transition:leave-end="opacity-0"
        @click="mobileMenuOpen = false"
        class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm md:hidden z-40"></div>

    <div x-show="mobileMenuOpen"
        x-cloak
        x-transition:enter="transition ease-out duration-300"
        x-transition:enter-start="translate-x-full"
        x-transition:enter-end="translate-x-0"
        x-transition:leave="transition ease-in duration-300"
        x-transition:leave-start="translate-x-0"
        x-transition:leave-end="translate-x-full"
        class="fixed right-0 top-0 h-full w-80 bg-white dark:bg-slate-900 shadow-2xl z-50 md:hidden overflow-y-auto">

        <div class="flex flex-col h-full">
            <div class="flex justify-between items-center p-5 mb-0">
                <a href="/" @click.prevent="navigateTo('/')">
                    <img src="/assets/images/logo.webp" alt="Logo" class="h-10 w-auto dark:hidden">
                    <img src="/assets/images/logo-dark-mode.webp" alt="Logo Dark" class="h-10 w-auto hidden dark:block">
                </a>
                <button @click="mobileMenuOpen = false" class="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M6 18L18 6M6 6l12 12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                    </svg>
                </button>
            </div>

            <div class="space-y-2 px-2 flex-1 mb-5 overflow-auto custom-scrollbar">
                <?php
                $getFullUrl = function ($link) {
                    if (!empty($link['page']['slug'])) {
                        return '/' . ltrim($link['page']['slug'], '/');
                    }
                    return $link['url'] ?? '#';
                };

                foreach ($menuItems as $link):
                    $linkUrl = $getFullUrl($link);
                    $isParentActive = ($currentPath === $linkUrl);
                    $hasActiveChild = false;

                    if (!empty($link['children'])) {
                        foreach ($link['children'] as $child) {
                            if ($currentPath === $getFullUrl($child)) {
                                $hasActiveChild = true;
                                break;
                            }
                        }
                    }
                    $shouldBeOpen = ($hasActiveChild) ? 'true' : 'false';
                ?>

                    <div x-data="{ open: <?= $shouldBeOpen ?> }"
                        class="overflow-hidden border transition-all duration-300 rounded-md <?= ($isParentActive || $hasActiveChild) ? 'border-indigo-500/50 dark:bg-indigo-500/5 dark:border-indigo-5 shadow-sm' : 'border-gray-100 dark:border-white/5 bg-white dark:bg-slate-800/50' ?>">

                        <div class="flex items-center w-full">
                            <a href="<?= $linkUrl ?>"
                                @click.prevent="navigateTo('<?= $linkUrl ?>')"
                                class="flex-1 px-5 py-4 text-base font-bold flex items-center gap-3 <?= $isParentActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white' ?>"
                                target="<?= $link['target'] ?>"
                                title="<?= $link['title'] ?>">

                                <div class="w-2 h-2 rounded-full transition-all <?= $isParentActive ? 'bg-indigo-500 scale-100' : 'bg-transparent scale-0' ?>"></div>

                                <?= htmlspecialchars($link['title']) ?>
                            </a>

                            <?php if (!empty($link['children']) && count($link['children']) > 0): ?>
                                <button @click="open = !open"
                                    class="px-5 py-4 border-l border-gray-100 dark:border-white/5 text-gray-400 transition-colors"
                                    :class="open ? 'text-indigo-500' : ''">
                                    <svg class="w-4 h-4 transition-transform duration-300" :class="open ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path d="M19 9l-7 7-7-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                                    </svg>
                                </button>
                            <?php endif; ?>
                        </div>

                        <?php if (!empty($link['children'])): ?>
                            <div x-show="open"
                                x-cloak
                                class="bg-gray-50/50 dark:bg-black/20 border-t border-gray-100 dark:border-white/5">
                                <?php foreach ($link['children'] as $child):
                                    $childUrl = $getFullUrl($child);
                                    $isChildActive = ($currentPath === $childUrl);
                                ?>
                                    <a href="<?= $childUrl ?>"
                                        @click.prevent="navigateTo('<?= $childUrl ?>')"
                                        class="flex items-center justify-between px-10 py-3.5 text-sm font-medium transition-all <?= $isChildActive ? 'text-indigo-600 dark:text-indigo-400 bg-white dark:bg-white/5' : 'text-gray-500 dark:text-gray-400' ?>"
                                        target="<?= $child['target'] ?>"
                                        title="<?= $child['title'] ?>">
                                        <span><?= htmlspecialchars($child['title']) ?></span>
                                        <?php if ($isChildActive): ?>
                                            <i class="fa-solid fa-chevron-right text-[10px]"></i>
                                        <?php endif; ?>
                                    </a>
                                <?php endforeach; ?>
                            </div>
                        <?php endif; ?>
                    </div>
                <?php endforeach; ?>
            </div>

            <div class="mt-auto pt-6 border-t border-gray-100 dark:border-slate-800 p-4">
                <?php if (isset($_SESSION['user_id'])): ?>
                    <div class="flex flex-col gap-2">
                        <a href="/users/profile" class="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white font-bold">
                            <i class="fa-solid fa-user"></i> Профил
                        </a>
                        <form action="/users/logout" method="POST">
                            <button type="submit" class="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-rose-500/10 text-rose-500 font-bold">
                                <i class="fa-solid fa-power-off"></i> Изход
                            </button>
                        </form>
                    </div>
                <?php else: ?>
                    <div @click.prevent="navigateTo('/contacts')">
                        <?php View::component('button', 'components', [
                            'text' => 'Направете запитване',
                            'class' => 'w-full justify-center py-4',
                            'icon' => 'fa-rocket'
                        ]); ?>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
</nav>

<?php if (!empty($pages) && count($pages) > 0): ?>
    <div id="editModal" class="fixed inset-0 z-10001 hidden overflow-y-auto">
        <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div class="fixed inset-0 transition-opacity bg-slate-900/50 backdrop-blur-sm" @click="closeModal()"></div>

            <div class="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-2xl shadow-2xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div class="px-8 py-6 bg-white">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-xl font-bold text-slate-900">Редактиране на елемент</h3>
                        <button type="button" onclick="closeModal()" class="text-slate-400 hover:text-slate-600 transition-colors">
                            <i class="fa-solid fa-xmark text-xl"></i>
                        </button>
                    </div>

                    <form id="editForm" class="space-y-5">
                        <input type="hidden" id="edit_item_id" name="id">

                        <div>
                            <label class="block text-sm font-semibold text-slate-700 mb-2">Име на линка</label>
                            <input type="text" id="edit_title" name="title" class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none">
                        </div>

                        <div>
                            <label class="block text-sm font-semibold text-slate-700 mb-2">Избери страница</label>
                            <select id="edit_page_id" name="page_id" class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none">
                                <option value="">-- Външен линк --</option>
                                <?php foreach ($pages as $id => $title): ?>
                                    <option value="<?= $id ?>"><?= htmlspecialchars($title) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>

                        <div>
                            <label class="block text-sm font-semibold text-slate-700 mb-2">Външен URL (ако няма страница)</label>
                            <input type="text" id="edit_url" name="url" class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none">
                        </div>

                        <div class="grid grid-cols-2 gap-4 pt-4">
                            <button type="button" onclick="closeModal()" class="px-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all text-sm">Отказ</button>
                            <button type="submit" class="px-6 py-3 rounded-xl bg-primary text-white font-bold hover:shadow-lg hover:shadow-primary/30 transition-all text-sm flex items-center justify-center gap-2">
                                <i class="fa-solid fa-save"></i> Запази промените
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
<?php endif; ?>

<script>
    function navbarComponent() {
        return {
            mobileMenuOpen: false,
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

                this.$watch('mobileMenuOpen', value => {
                    if (value) {
                        document.body.classList.add('overflow-hidden');
                        document.body.style.paddingRight = (window.innerWidth - document.documentElement.clientWidth) + 'px';
                    } else {
                        document.body.classList.remove('overflow-hidden');
                        document.body.style.paddingRight = '0px';
                    }
                });
            },

            handleScroll() {
                this.scrolled = window.pageYOffset > 10;
            },

            isActive(url) {
                const currentPath = window.location.pathname;
                return currentPath === url || (url !== '/' && currentPath.startsWith(url));
            },

            hasActiveChild(link) {
                if (!link.children) return false;
                return link.children.some(child => this.isActive(child['url']));
            },

            navigateTo(url) {
                if (this.mobileMenuOpen) {
                    this.mobileMenuOpen = false;
                    document.body.classList.remove('overflow-hidden');
                    document.body.style.paddingRight = '0px';

                    setTimeout(() => {
                        window.location.href = url;
                    }, 350);
                } else {
                    window.location.href = url;
                }
            },

            toggleMobileMenu() {
                this.mobileMenuOpen = !this.mobileMenuOpen;
                document.body.style.overflow = this.mobileMenuOpen ? 'hidden' : '';
            }
        }
    }
</script>

<style>
    body.overflow-hidden {
        overflow: hidden !important;
        height: 100vh;
    }
</style>
