<?php
use App\Core\View;
?>

<div class="space-y-5 p-2" x-data="infiniteIndexComponent()" x-init="init()">

    <template x-for="(post, index) in posts" :key="post.id">
        <div class="max-w-xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
            x-data="{
                current: 0,
                images: post.images || [],
                isExpanded: false,
                textLimit: 250,
                fullText: post.content || '',
                openLightbox: false,
                lightboxCurrent: 0
            }">

            <div class="p-2 flex items-center space-x-3 border-b border-gray-200 dark:border-gray-700">
                <div class="shrink-0 w-10 h-10">
                    <template x-if="post.user && post.user.options && post.user.options.profile_image">
                        <img :src="post.user.options.profile_image"
                            class="w-full h-full rounded-full object-cover shadow-sm border border-gray-100 dark:border-gray-700"
                            :alt="post.user.name || 'Потребител'">
                    </template>
                    <template x-if="!post.user || !post.user.options || !post.user.options.profile_image">
                        <div class="w-full h-full bg-linear-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
                            x-text="post.user && post.user.name ? post.user.name.substring(0, 1) : 'А'">
                        </div>
                    </template>
                </div>

                <div class="flex-1 min-w-0">
                    <a :href="'/accounts/' + urlencode(post.user ? post.user.id : '')" class="block group">
                        <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate hover:underline cursor-pointer"
                            x-text="post.user ? post.user.name : 'Анонимен'">
                        </h2>
                    </a>

                    <div class="flex items-center space-x-1.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        <span x-text="formatDateTime(post.created_at)"></span>
                        <template x-if="post.location">
                            <div class="flex items-center space-x-1.5">
                                <span>•</span>
                                <a :href="'?location=' + urlencode(post.location)"
                                    class="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                    x-text="post.location">
                                </a>
                            </div>
                        </template>
                    </div>
                </div>
            </div>

            <div class="py-2 px-3">
                <template x-if="post.name">
                    <a :href="'/posts/' + urlencode(post.id)" class="block group">
                        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 transition-colors"
                            x-text="post.name">
                        </h2>
                    </a>
                </template>

                <p x-show="fullText.length <= textLimit || isExpanded"
                    class="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line" x-text="fullText">
                </p>

                <p x-show="fullText.length > textLimit && !isExpanded"
                    class="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-normal">
                    <span x-text="fullText.substring(0, textLimit).replace(/\s+/g, ' ').trim() + '...'"></span>
                    <button type="button" @click="isExpanded = true"
                        class="text-blue-600 dark:text-blue-400 hover:underline font-semibold inline-block ml-1 focus:outline-none cursor-pointer">
                        Виж повече
                    </button>
                </p>

                <div x-show="fullText.length > textLimit && isExpanded" class="mt-1">
                    <button type="button" @click="isExpanded = false"
                        class="text-blue-600 dark:text-blue-400 hover:underline font-semibold text-sm focus:outline-none cursor-pointer">
                        Свиване
                    </button>
                </div>
            </div>

            <template x-if="images && images.length > 0">
                <div class="border-y border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <div class="relative group bg-black flex items-center justify-center h-105">

                        <button type="button"
                            class="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 rounded-full shadow-md transition z-10 opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                            @click="current = (current === 0) ? images.length - 1 : current - 1"
                            x-show="images.length > 1">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                                    d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        <img :src="images[current]"
                            class="max-w-full max-h-full object-contain select-none cursor-zoom-in" alt="Публикация"
                            @click="lightboxCurrent = current; openLightbox = true;">

                        <button type="button"
                            class="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 rounded-full shadow-md transition z-10 opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                            @click="current = (current === images.length - 1) ? 0 : current + 1"
                            x-show="images.length > 1">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                                    d="M9 5l7 7-7 7" />
                            </svg>
                        </button>

                        <div class="absolute bottom-3 right-3 bg-black/60 text-white px-2 py-1 rounded text-xs font-medium tracking-wider"
                            x-show="images.length > 1">
                            <span x-text="current + 1"></span>/<span x-text="images.length"></span>
                        </div>
                    </div>

                    <template x-if="images.length > 1">
                        <div
                            class="p-3 bg-white dark:bg-gray-800 flex items-center justify-start overflow-x-auto border-t border-gray-100 dark:border-gray-700 w-full px-4 scrollbar-thin custom-scrollbar">
                            <div class="flex space-x-2 min-w-max mx-auto">
                                <template x-for="(image, imgIndex) in images">
                                    <button type="button"
                                        class="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 transition focus:outline-none border-2 block cursor-pointer"
                                        :class="current === imgIndex ? 'border-blue-600 dark:border-blue-500 scale-105 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'"
                                        @click="current = imgIndex">
                                        <img :src="image" class="w-full h-full object-cover" alt="Миниатюра">
                                    </button>
                                </template>
                            </div>
                        </div>
                    </template>
                </div>
            </template>

            <template x-if="post.video_url">
                <div class="border-t border-gray-100 dark:border-gray-700 bg-black">
                    <video controls class="w-full max-h-95 object-contain">
                        <source :src="post.video_url">
                    </video>
                </div>
            </template>

            <div x-show="openLightbox" x-transition
                class="fixed inset-0 bg-black/95 flex items-center justify-center z-50 select-none"
                @keydown.window.escape="openLightbox = false"
                @keydown.window.left="if (images.length > 1) lightboxCurrent = (lightboxCurrent === 0) ? images.length - 1 : lightboxCurrent - 1"
                @keydown.window.right="if (images.length > 1) lightboxCurrent = (lightboxCurrent === images.length - 1) ? 0 : lightboxCurrent + 1"
                x-cloak>

                <button type="button" @click="openLightbox = false"
                    class="absolute top-5 right-5 text-white/70 hover:text-white p-2 rounded-full focus:outline-none bg-black/40 hover:bg-black/60 transition z-50 cursor-pointer">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <button type="button" x-show="images.length > 1"
                    @click="lightboxCurrent = (lightboxCurrent === 0) ? images.length - 1 : lightboxCurrent - 1"
                    class="absolute left-5 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-3 rounded-full focus:outline-none bg-black/40 hover:bg-black/60 transition z-50 cursor-pointer">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                <div class="max-w-[90vw] max-h-[85vh] flex items-center justify-center">
                    <img :src="images[lightboxCurrent]" class="max-w-full max-h-[85vh] object-contain rounded-sm"
                        alt="Lightbox">
                </div>

                <button type="button" x-show="images.length > 1"
                    @click="lightboxCurrent = (lightboxCurrent === images.length - 1) ? 0 : lightboxCurrent + 1"
                    class="absolute right-5 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-3 rounded-full focus:outline-none bg-black/40 hover:bg-black/60 transition z-50 cursor-pointer">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
                    </svg>
                </button>

                <div class="absolute bottom-6 bg-black/60 text-white/90 px-3 py-1.5 rounded-full text-sm font-medium tracking-wider"
                    x-show="images.length > 1">
                    <span x-text="lightboxCurrent + 1"></span> / <span x-text="images.length"></span>
                </div>
            </div>

        </div>
    </template>

    <div x-show="loading" class="flex justify-center py-4" style="display: none;">
        <i class="fa-solid fa-spinner animate-spin text-gray-400 dark:text-gray-500 text-xl"></i>
    </div>

    <div x-ref="loadMoreMarker" class="h-1 w-full"></div>
</div>

<script>
    function infiniteIndexComponent() {
        return {
            posts: [],
            page: 1,
            loading: false,
            hasMore: true,

            init() {
                this.loadPosts();

                this.$nextTick(() => {
                    const observer = new IntersectionObserver((entries) => {
                        if (entries[0].isIntersecting && !this.loading && this.hasMore) {
                            this.loadPosts();
                        }
                    }, {
                        rootMargin: '300px'
                    });
                    observer.observe(this.$refs.loadMoreMarker);
                });
            },

            async loadPosts() {
                if (this.loading || !this.hasMore) return;
                this.loading = true;

                try {
                    const urlParams = new URLSearchParams(window.location.search);
                    const locationParam = urlParams.get('location') || '';
                    const searchParam = urlParams.get('search') || '';
                    const categoryIdParam = urlParams.get('category_id') || '';
                    const response = await fetch(`<?= AUTH_SERVER_URL ?>/api/posts?page=${this.page}&location=${encodeURIComponent(locationParam)}&search=${encodeURIComponent(searchParam)}&category_id=${encodeURIComponent(categoryIdParam)}`);

                    if (!response.ok) throw new Error('API Error');

                    const data = await response.json();
                    const fetchedPosts = data.posts || [];

                    if (fetchedPosts.length === 0) {
                        this.hasMore = false;
                    } else {
                        fetchedPosts.forEach(post => {
                            if (typeof post.options === 'string') post.options = JSON.parse(post.options);
                            if (typeof post.images === 'string') post.images = JSON.parse(post.images);
                            if (post.user && typeof post.user.options === 'string') post.user.options = JSON.parse(post.user.options);
                        });

                        this.posts.push(...fetchedPosts);
                        this.page++;

                        if (fetchedPosts.length < 5) {
                            this.hasMore = false;
                        }
                    }
                } catch (error) {
                    console.error('Грешка при зареждане на индекса:', error);
                    this.hasMore = false;
                } finally {
                    this.loading = false;
                }
            },

            formatDateTime(dateString) {
                if (!dateString) return '';
                const date = new Date(dateString);
                if (isNaN(date.getTime())) return dateString;
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${day}.${month}.${year} в ${hours}:${minutes}`;
            },

            urlencode(str) {
                return encodeURIComponent(str || '');
            }
        }
    }
</script>