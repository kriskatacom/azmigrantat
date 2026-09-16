<div class="max-w-4xl mx-auto border-t border-gray-200 dark:border-gray-700/60 p-2 md:p-5 space-y-2 md:space-y-5"
     x-data="infinitePostsComponent()"
     x-init="init()">
    
    <h3 class="text-xl font-semibold text-gray-900 dark:text-white text-center md:text-left">Публикации</h3>

    <div x-show="posts.length > 0" class="grid sm:grid-cols-2 gap-4" style="display: none;">
        <template x-for="post in posts" :key="post.id">
            <div class="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800/60 overflow-hidden flex flex-col h-full">
                
                <div class="w-full h-44 bg-gray-100 dark:bg-gray-800 relative shrink-0">
                    <template x-if="post.options && post.options.main_image">
                        <a :href="'/posts/' + encodeURIComponent(post.id)" class="">
                            <img :src="post.options.main_image" class="w-full h-full object-cover" alt="">
                        </a>
                    </template>
                </div>

                <div class="p-4 flex flex-col flex-1 justify-between gap-3">
                    <a :href="'/posts/' + encodeURIComponent(post.id)" class="block group">
                        <h4 class="max-sm:text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200"
                            x-text="post.name">
                        </h4>
                    </a>
                    <div class="max-md:text-sm text-gray-400 dark:text-gray-500" x-text="formatDate(post.created_at)">
                    </div>
                </div>

            </div>
        </template>
    </div>

    <div x-show="!loading && posts.length === 0" 
         class="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-800"
         style="display: none;">
        Няма споделени публикации от този потребител.
    </div>

    <div x-show="loading" class="flex justify-center py-4" style="display: none;">
        <i class="fa-solid fa-spinner animate-spin text-gray-400 dark:text-gray-500 text-xl"></i>
    </div>

    <div x-ref="loadMoreMarker" class="h-1 w-full"></div>
</div>

<script>
function infinitePostsComponent() {
    return {
        posts: [],
        page: 1,
        loading: false,
        hasMore: true,
        userId: null,

        init() {
            const match = window.location.pathname.match(/\/accounts\/(\d+)/);
            if (!match) return;
            this.userId = match[1];

            this.loadPosts();

            this.$nextTick(() => {
                const observer = new IntersectionObserver((entries) => {
                    if (entries[0].isIntersecting && !this.loading && this.hasMore) {
                        this.loadPosts();
                    }
                }, {
                    rootMargin: '200px'
                });
                
                observer.observe(this.$refs.loadMoreMarker);
            });
        },

        async loadPosts() {
            if (this.loading || !this.hasMore) return;
            
            this.loading = true;

            try {
                const response = await fetch(`<?= AUTH_SERVER_URL ?>/api/posts/user/${this.userId}?page=${this.page}`);
                if (!response.ok) throw new Error('API Error');
                
                const data = await response.json();
                data.posts.forEach(post => {
                    post.options = JSON.parse(post.options);
                });
                const newPosts = Array.isArray(data) ? data : (data.posts || []);

                if (newPosts.length === 0) {
                    this.hasMore = false;
                } else {
                    this.posts.push(...newPosts);
                    this.page++;
                    
                    if (newPosts.length < 6) {
                        this.hasMore = false;
                    }
                }
            } catch (error) {
                console.error('Грешка при зареждане на публикациите:', error);
                this.hasMore = false;
            } finally {
                this.loading = false;
            }
        },

        formatDate(dateString) {
            if (!dateString) return '';
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            
            return `${day}.${month}.${year}`;
        }
    }
}
</script>
