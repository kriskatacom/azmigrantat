<div class="fixed bottom-8 right-8 z-50 flex md:hidden flex-col gap-4">
    <div class="group relative">
        <div class="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Имаш проект? Свържи се с мен
        </div>
        
        <a href="tel:+<?= CONTACTS['phone_clean'] ?>" 
           class="w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center text-2xl hover:scale-110 hover:rotate-12 transition-all duration-300">
            <i class="fa-solid fa-phone-volume"></i>
        </a>
        
        <div class="absolute inset-0 bg-indigo-600 rounded-full animate-ping opacity-20 -z-10"></div>
    </div>
</div>