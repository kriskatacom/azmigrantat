<?php

use App\Services\HelperService;

$imagesList = [];
if (!empty($images)) {
    $imagesList = is_string($images) ? json_decode($images, true) : (array)$images;
}

$jsonImages = htmlspecialchars(json_encode($imagesList), ENT_QUOTES, 'UTF-8');
$galleryId = 'gallery_' . uniqid();
$variant = $variant ?? 'card';
$buttonClasses = "btn-primary w-full sm:w-auto";
if (!empty($buttonClassesParam)) {
    $buttonClasses .= " " . $buttonClassesParam;
}
?>

<div class="w-full sm:w-auto" x-data="galleryComponent(<?= $jsonImages ?>)" x-init="init()">
    
    <?php if ($variant === 'card'): ?>
    <div class="bg-white border border-gray-200 rounded md:rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div class="p-2 md:p-5 border-b border-gray-200 flex items-center gap-2 text-xs md:text-lg lg:text-xl font-bold">
            <?php HelperService::icon($icon ?? 'image', 'w-5 h-5 md:w-8 md:h-8 text-primary-dark'); ?>
            <?= htmlspecialchars($title ?? HelperService::trans('gallery')) ?>
        </div>
        <div class="p-2 md:p-5 flex-1">
            <template x-if="images.length === 0">
                <div class="text-gray-500 text-center py-10"><?= HelperService::trans('no_photos_available') ?></div>
            </template>
            <template x-if="images.length > 0">
                <div class="swiper rounded-lg relative w-full h-full" x-ref="previewSwiper">
                    <div class="swiper-wrapper">
                        <template x-for="(img, index) in images" :key="index">
                            <div class="swiper-slide">
                                <a :href="img" data-fancybox="<?= $galleryId ?>" class="block cursor-zoom-in h-full">
                                    <img :src="img" class="w-full h-full object-cover rounded-lg">
                                </a>
                            </div>
                        </template>
                    </div>
                </div>
            </template>
        </div>
    </div>

    <?php elseif ($variant === 'button'): ?>
        <template x-if="images.length > 0">
            <div>
                <button @click="openGallery()" class="<?= $buttonClasses ?>">
                    <?php HelperService::icon('image', 'w-5 h-5'); ?>
                    <?= $title ?? HelperService::trans('view_gallery') ?>
                    <span class="opacity-70" x-text="'(' + images.length + ')'"></span>
                </button>
                <div class="hidden">
                    <template x-for="(img, index) in images" :key="'hidden_'+index">
                        <a :href="img" data-fancybox="<?= $galleryId ?>"></a>
                    </template>
                </div>
            </div>
        </template>

    <?php elseif ($variant === 'thumbnail'): ?>
        <template x-if="images.length > 0">
            <div class="relative group cursor-pointer overflow-hidden rounded-xl shadow-md h-64" @click="openGallery()">
                <img :src="images[0]" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
                <div class="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div class="text-white text-center">
                         <?php HelperService::icon('image', 'w-8 h-8 mx-auto mb-2'); ?>
                         <span class="font-bold tracking-widest text-sm"><?= HelperService::trans('view_all_photos') ?></span>
                    </div>
                </div>
                <div class="hidden">
                    <template x-for="(img, index) in images" :key="'thumb_'+index">
                        <a :href="img" data-fancybox="<?= $galleryId ?>"></a>
                    </template>
                </div>
            </div>
        </template>
    <?php endif; ?>

</div>

<script>
    if (typeof galleryComponent !== 'function') {
        function galleryComponent(images) {
            return {
                images: images,
                previewSwiper: null,
                galleryId: '<?= $galleryId ?>',

                init() {
                    if (this.images.length > 0 && this.$refs.previewSwiper) {
                        this.$nextTick(() => {
                            this.previewSwiper = new Swiper(this.$refs.previewSwiper, {
                                loop: false,
                                slidesPerView: 1,
                                spaceBetween: 10,
                                observer: true,
                                observeParents: true
                            });
                        });
                    }
                },

                openGallery() {
                    Fancybox.show(
                        this.images.map(img => ({ src: img, type: "image" }))
                    );
                }
            }
        }
    }
</script>

<style>
    .swiper-wrapper .swiper-slide {
        height: auto !important;
    }
</style>