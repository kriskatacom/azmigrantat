<?php

use App\Core\View;
?>

<section id="contact-form" class="pb-32 bg-white dark:bg-slate-950 transition-colors duration-500 relative">
    <div class="container mx-auto px-4">
        <div class="max-w-6xl mx-auto">
            <div class="flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] overflow-hidden border border-slate-100 dark:border-white/5 shadow-2xl">

                <div class="w-full lg:w-2/5 bg-indigo-600 p-10 md:p-16 text-white relative overflow-hidden">
                    <div class="absolute -top-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                    <div class="absolute -bottom-20 -right-20 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl"></div>

                    <div class="relative z-10 h-full flex flex-col">
                        <h3 class="text-3xl font-black mb-8 tracking-tighter">Информация за контакт</h3>

                        <div class="space-y-8 mb-12 flex-1">
                            <div class="flex items-start gap-5 group">
                                <div class="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-all">
                                    <i class="fa-solid fa-envelope text-xl text-indigo-100"></i>
                                </div>
                                <div>
                                    <p class="text-xs font-bold uppercase tracking-widest text-indigo-200 mb-1">Пишете ми на</p>
                                    <a href="mailto:contact@kristiankostadinov.com" class="text-lg font-bold hover:underline">info@kriskata.com</a>
                                </div>
                            </div>

                            <div class="flex items-start gap-5 group">
                                <div class="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-all">
                                    <i class="fa-solid fa-phone text-xl text-indigo-100"></i>
                                </div>
                                <div>
                                    <p class="text-xs font-bold uppercase tracking-widest text-indigo-200 mb-1">Обадете се</p>
                                    <a href="tel:+359899718824" class="text-lg font-bold hover:underline">+359 899 718 824</a>
                                </div>
                            </div>

                            <div class="flex items-start gap-5 group">
                                <div class="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-all">
                                    <i class="fa-solid fa-location-dot text-xl text-indigo-100"></i>
                                </div>
                                <div>
                                    <p class="text-xs font-bold uppercase tracking-widest text-indigo-200 mb-1">Локация</p>
                                    <p class="text-lg font-bold">гр. Дупница / Remote</p>
                                </div>
                            </div>
                        </div>

                        <div class="flex gap-4 pt-10 border-t border-white/10">
                            <a href="#" class="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white hover:text-indigo-600 transition-all"><i class="fa-brands fa-github"></i></a>
                            <a href="#" class="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white hover:text-indigo-600 transition-all"><i class="fa-brands fa-linkedin-in"></i></a>
                            <a href="#" class="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white hover:text-indigo-600 transition-all"><i class="fa-brands fa-instagram"></i></a>
                        </div>
                    </div>
                </div>

                <div class="w-full lg:w-3/5 p-10 md:p-16 bg-white dark:bg-slate-900/80">
                    <form action="/contacts" method="POST" enctype="multipart/form-data" class="space-y-6">
                        <div id="form-response" class="hidden mb-6 p-4 rounded-2xl text-sm font-bold text-center border transition-all duration-300"></div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="relative">
                                <label class="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 block">Вашето име</label>
                                <input type="text" name="name" required placeholder="Иван Иванов"
                                    class="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-slate-900 dark:text-white outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-all">
                            </div>
                            <div class="relative">
                                <label class="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 block">Имейл адрес</label>
                                <input type="email" name="email" required placeholder="example@mail.com"
                                    class="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-slate-900 dark:text-white outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-all">
                            </div>
                        </div>

                        <div class="relative">
                            <label class="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 block">Относно</label>

                            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <?php
                                foreach (SERVICES as $val => $label):
                                ?>
                                    <label class="cursor-pointer group">
                                        <input type="radio" name="subject" value="<?= $val ?>" class="peer hidden" <?= $val === 'web-development' ? 'checked' : '' ?>>
                                        <div class="text-center p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 transition-all peer-checked:border-indigo-500 peer-checked:bg-indigo-500/10 peer-checked:text-indigo-500 hover:border-indigo-500/50">
                                            <span class="text-sm font-bold"><?= $label ?></span>
                                        </div>
                                    </label>
                                <?php endforeach; ?>
                            </div>
                        </div>

                        <div class="relative">
                            <label class="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 block">Съобщение</label>
                            <textarea name="message" rows="5" required placeholder="Разкажете ми малко повече за проекта..."
                                class="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all resize-none"></textarea>
                        </div>

                        <div class="relative">
                            <label class="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 block">Прикачен файл (по избор)</label>
                            <div class="relative group">
                                <input type="file" name="attachment" id="file-input" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10">
                                <div class="w-full bg-slate-50 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/20 rounded-2xl px-5 py-4 flex items-center justify-between transition-all group-hover:border-indigo-500">
                                    <span id="file-name" class="text-slate-500 text-sm italic">Няма избран файл...</span>
                                    <i class="fa-solid fa-cloud-arrow-up text-indigo-500"></i>
                                </div>
                            </div>
                            <p class="text-[9px] text-slate-400 mt-1 uppercase tracking-tighter">Макс. 5MB (PDF, JPG, PNG, DOCX)</p>
                        </div>

                        <div class="hidden">
                            <input type="text" name="b_honeypot">
                        </div>

                        <?php View::component('submit-button', 'components', [
                            'text' => 'Изпрати съобщение',
                            'icon' => 'fa-paper-plane',
                            'class' => 'w-full py-6 text-xl shadow-2xl'
                        ]); ?>

                        <p class="text-center text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                            Гарантирам отговор в рамките на 24 работни часа.
                        </p>
                    </form>
                </div>

            </div>
        </div>
    </div>
</section>

<script>
    document.getElementById('file-input').addEventListener('change', function(e) {
        const fileName = e.target.files[0]?.name || 'Няма избран файл...';
        document.getElementById('file-name').textContent = fileName;
        document.getElementById('file-name').classList.remove('text-slate-500');
        document.getElementById('file-name').classList.add('text-indigo-500', 'font-bold');
    });
</script>
