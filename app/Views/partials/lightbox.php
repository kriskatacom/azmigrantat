<div id="global-image-modal"
    class="fixed inset-0 z-100 flex items-center justify-center p-4 
           bg-black/90 backdrop-blur-md cursor-zoom-out
           opacity-0 pointer-events-none transition-all duration-300 ease-in-out">

    <button type="button"
        class="absolute top-5 right-5 text-white/50 hover:text-white transition-all duration-300 z-110 hover:rotate-90">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
        </svg>
    </button>

    <img id="global-modal-img"
        src=""
        class="max-w-full max-h-full rounded-2xl shadow-2xl border-4 border-white/10
               transform scale-90 translate-y-4 transition-transform duration-300 ease-out">
</div>

<style>
    #global-image-modal.active { opacity: 1 !important; pointer-events: auto !important; }
    #global-image-modal.active #global-modal-img { transform: scale(1) translateY(0) !important; }
    .animate-fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const grid = document.getElementById('image-preview-grid');
    const modal = document.getElementById('global-image-modal');
    const modalImg = document.getElementById('global-modal-img');
    const closeBtn = modal.querySelector('button');

    function openModal(src) {
        if (!src || src.includes('no-image.png')) return;
        modalImg.src = src;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(() => {
            if (!modal.classList.contains('active')) modalImg.src = '';
        }, 300);
    }

    document.addEventListener('click', function(e) {
        const trigger = e.target.closest('.lightbox-trigger');
        if (trigger) {
            e.preventDefault();
            const imageSrc = trigger.getAttribute('data-src') || trigger.getAttribute('src');
            openModal(imageSrc);
        }
    });

    modal.addEventListener('click', (e) => (e.target === modal || e.target.closest('button')) && closeModal());
    document.addEventListener('keydown', (e) => e.key === 'Escape' && closeModal());


    if (grid) {
        const input = grid.querySelector('.multi-image-input');

        input.addEventListener('change', function() {
            Array.from(this.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const div = document.createElement('div');
                    div.className = "relative group aspect-video rounded-2xl overflow-hidden border border-gray-100 shadow-sm animate-fade-in bg-gray-100 transition-all duration-300 hover:shadow-xl hover:-translate-y-1";
                    
                    div.innerHTML = `
                        <img src="${e.target.result}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
                        <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div class="absolute top-2 left-2 bg-indigo-600 text-white px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg border border-indigo-400 z-20">
                            Нова
                        </div>

                        <div class="absolute top-2 right-2 flex opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
                            <button type="button" class="remove-new w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur-sm text-red-500 rounded-xl shadow-lg hover:bg-red-500 hover:text-white transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    `;
                    grid.appendChild(div);
                };
                reader.readAsDataURL(file);
            });
        });

        grid.addEventListener('click', function(e) {
            const btn = e.target.closest('.remove-existing, .remove-new');
            if (btn) {
                e.preventDefault();
                const item = btn.closest('.relative.group');
                item.style.transform = 'scale(0.8)';
                item.style.opacity = '0';
                setTimeout(() => item.remove(), 250);
            }
        });
    }
});
</script>
