<?php
$name = $name ?? 'additional_images[]';
$label = $label ?? 'Галерия със снимки';
$images = $images ?? [];
?>

<div class="grid grid-cols-2 md:grid-cols-4 gap-4" id="image-preview-grid">
    <label class="cursor-pointer group aspect-video rounded-2xl border-2 border-dashed border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all duration-300 flex flex-col items-center justify-center gap-2 text-center px-4 bg-gray-50/50">
        <input type="file" name="<?= $name ?>" multiple accept="image/*" class="hidden multi-image-input">
        
        <div class="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
        </div>

        <span class="text-sm font-bold text-gray-600 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
            Добави снимки
        </span>

        <span class="text-[10px] text-gray-400 font-medium leading-tight">
            JPG, PNG, WebP, GIF
        </span>
    </label>

    <?php foreach ($images as $imgUrl): 
        $fullPath = \App\Services\HelperService::getImage($imgUrl);
    ?>
        <div class="relative group aspect-video rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-gray-100 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 animate-fade-in">
            <img src="<?= $fullPath ?>" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">

            <div class="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <div class="absolute top-2 right-2 flex gap-1.5 translate-y-2.5 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-10">
                
                <button type="button" 
                   data-src="<?= $fullPath ?>"
                   class="lightbox-trigger w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur-sm text-amber-500 rounded-xl shadow-lg hover:bg-amber-500 hover:text-white transition-all duration-200" 
                   title="Преглед">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                </button>

                <a href="<?= $fullPath ?>" download target="_blank" 
                   class="w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur-sm text-indigo-600 rounded-xl shadow-lg hover:bg-indigo-600 hover:text-white transition-all duration-200" 
                   title="Изтегли">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a2 2 0 002 2h12 a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                </a>

                <button type="button" class="remove-existing w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur-sm text-red-500 rounded-xl shadow-lg hover:bg-red-500 hover:text-white transition-all duration-200" title="Изтрий">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>

            <input type="hidden" name="existing_images[]" value="<?= $imgUrl ?>">
        </div>
    <?php endforeach; ?>
</div>

<script>
document.addEventListener('click', function (e) {
    // Намираме най-близкия бутон за изтриване
    const deleteBtn = e.target.closest('.remove-existing');
    
    if (deleteBtn) {
        e.preventDefault();
        
        if (confirm('Сигурни ли сте, че искате да премахнете тази снимка?')) {
            // Намираме контейнера на снимката (div-а с рамката)
            const imageWrapper = deleteBtn.closest('.relative.group');
            
            if (imageWrapper) {
                // Добавяме анимация за изчезване
                imageWrapper.style.transition = 'opacity 0.3s, transform 0.3s';
                imageWrapper.style.opacity = '0';
                imageWrapper.style.transform = 'scale(0.9)';
                
                setTimeout(() => {
                    imageWrapper.remove();
                }, 300);
            }
        }
    }
});
</script>