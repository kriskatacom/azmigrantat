<div x-data="pinnedCompanyComponent()" x-init x-show="company" x-cloak>

    <div
        class="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs overflow-hidden transition-all duration-300 hover:border-gray-300 dark:hover:border-gray-700">
        <div class="flex flex-col md:flex-row items-stretch">

            <div class="w-full md:w-2/5 min-h-50 md:min-h-full relative shrink-0 bg-gray-100 dark:bg-gray-800">
                <template x-if="company && company.options && company.options.image_url">
                        <img :src="'<?= BUSINESS_PUBLIC_WEBSITE_SERVER_URL ?>' + company.options.image_url"
                        class="absolute inset-0 w-full h-full object-cover select-none" :alt="company.name">
                </template>

                <template x-if="!company || !company.options || !company.options.image_url">
                    <div
                        class="absolute inset-0 flex items-center justify-center bg-linear-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700">
                        <i class="fa-solid fa-building text-gray-400 text-3xl"></i>
                    </div>
                </template>
            </div>

            <div class="flex-1 p-5 md:p-6 flex flex-col justify-between gap-4">

                <div class="space-y-2">
                    <h3 class="text-lg md:text-xl font-bold text-gray-900 dark:text-white leading-snug"
                        x-text="company ? company.name : ''">
                    </h3>

                    <div class="text-sm md:text-base text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3 post-html-content"
                        x-html="company ? company.description : ''">
                    </div>
                </div>

                <div class="pt-2 md:pt-0">
                    <a :href="company && country && city && category 
                        ? '<?= BUSINESS_PUBLIC_WEBSITE_SERVER_URL ?>/' + country.slug + city.slug + '/' + category.slug + '/' + company.slug 
                        : '#'" 
                        target="_blank"
                        class="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer">
                        Виж повече
                    </a>
                </div>

            </div>

        </div>
    </div>
</div>

<script>
    function pinnedCompanyComponent() {
        return {
            company: null,
            country: null,
            city: null,
            category: null,
            userId: null,

            init() {
                const match = window.location.pathname.match(/\/accounts\/(\d+)/);
                if (!match) return;
                this.userId = match[1];

                this.fetchCompany();
            },

            async fetchCompany() {
                try {
                    const response = await fetch(`<?= BUSINESS_PUBLIC_WEBSITE_SERVER_URL ?>/admin/companies/user/${this.userId}`);

                    if (!response.ok) throw new Error('Грешка при комуникация със сървъра');

                    const data = await response.json();

                    if (data && data.company) {
                        this.company = data.company;
                        this.country = data.country;
                        this.city = data.city;
                        this.category = data.category;
                    }
                } catch (error) {
                    console.error('Грешка при зареждане на закачената компания:', error);
                }
            }
        }
    }
</script>
