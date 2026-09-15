<style>
    /* Основен контейнер */
    .dropzone {
        border: 2px dashed #cbd5e1;
        border-radius: 1.25rem;
        background: #f8fafc;
        transition: all 0.3s ease;
        min-height: 200px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    }

    .dropzone.dz-drag-hover {
        border-color: #3b82f6;
        background: #eff6ff;
    }

    /* Скриваме само съобщението, когато започне качването */
    .dropzone.dz-started .dz-message {
        display: none;
    }

    /* ВАЖНО: Скриваме автоматичните контейнери на Dropzone, които той създава ВЪТРЕ във формата */
    #mediaUpload .dz-preview {
        display: none !important;
    }
</style>

<div class="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
    <div class="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <h2 class="text-xl font-bold text-slate-800 flex items-center gap-2">
            <i class="fa-solid fa-cloud-arrow-up text-blue-600"></i>
            Мултимедиен център
        </h2>
        <span class="text-xs font-medium text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
            Max: 500MB
        </span>
    </div>

    <div class="p-8">
        <form action="/admin/media/store" class="dropzone" id="mediaUpload">
            <div class="dz-message group">
                <div class="flex flex-col items-center">
                    <div class="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <i class="fa-solid fa-plus text-2xl"></i>
                    </div>
                    <span class="text-lg font-semibold text-slate-700">Плъзнете файлове тук</span>
                    <p class="text-slate-400 text-sm">Снимки, Видеа, PDF, Офис документи</p>
                </div>
            </div>
        </form>

        <div id="previews" class="mt-8 space-y-4"></div>
    </div>
</div>

<div id="template-container" style="display: none;">
    <div class="dz-preview dz-file-preview bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-center gap-4">
        <div class="w-12 h-12 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-2xl overflow-hidden shrink-0">
            <img data-dz-thumbnail class="object-cover w-full h-full" />
            <i class="fa-solid fa-file text-slate-300 dz-nopreview hidden"></i>
        </div>

        <div class="flex-1 w-full min-w-0">
            <div class="flex justify-between items-start mb-1 gap-4">
                <div class="min-w-0 flex-1">
                    <p class="text-sm font-bold text-slate-700 truncate" data-dz-name></p>
                    <p class="text-[10px] text-slate-400 uppercase font-bold" data-dz-size></p>
                </div>
                <div class="text-right shrink-0">
                    <span class="dz-speed text-[11px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded transition-all"></span>

                    <span class="dz-eta text-[11px] text-slate-500 ml-2">Подготовка...</span>
                </div>
            </div>

            <div class="relative h-2 bg-slate-200 rounded-full overflow-hidden">
                <div class="dz-upload absolute top-0 left-0 h-full bg-blue-500 transition-all duration-300" style="width:0%" data-dz-uploadprogress></div>
            </div>

            <div class="flex justify-between mt-1">
                <span class="dz-percent text-[11px] font-bold text-slate-600">0%</span>
                <span class="dz-status text-[11px] text-slate-400 italic">Качване...</span>
            </div>
        </div>

        <button data-dz-remove class="p-2 hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
            <i class="fa-solid fa-trash-can"></i>
        </button>
    </div>
</div>

<script>
    Dropzone.autoDiscover = false;

    const myDropzone = new Dropzone("#mediaUpload", {
        url: "/admin/media/store",
        paramName: "file",
        maxFilesize: 500,
        parallelUploads: 3,
        // ВАЖНО: Използваме innerHTML
        previewTemplate: document.querySelector('#template-container').innerHTML,
        previewsContainer: "#previews",
        acceptedFiles: "image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip,.rar".replace(/\s/g, ''),

        init: function() {
            this.on("addedfile", function(file) {
                const el = file.previewElement;

                // Проверка за тип файл
                if (!file.type.match(/image.*/)) {
                    const img = el.querySelector("img");
                    if (img) img.style.display = "none";
                    el.querySelector(".dz-nopreview").classList.remove("hidden");
                }
            });

            this.on("uploadprogress", function(file, progress, bytesSent) {
                const el = file.previewElement;
                if (!el) return;

                // 1. Обновяване на визуалната лента и процента
                const progressBar = el.querySelector(".dz-upload");
                const percentLabel = el.querySelector(".dz-percent");

                if (progressBar) progressBar.style.width = progress + "%";
                if (percentLabel) percentLabel.textContent = Math.round(progress) + "%";

                // 2. Изчисляване на скоростта
                const uploadInfo = file.upload;
                if (uploadInfo && bytesSent > 0) {
                    const currentTime = new Date().getTime();
                    const elapsedSeconds = (currentTime - uploadInfo.start) / 1000;

                    // Изчисляваме само ако е минало поне малко време, за да избегнем делене на 0
                    if (elapsedSeconds > 0.1) {
                        const bps = bytesSent / elapsedSeconds; // байтове в секунда

                        // Преобразуване в четим формат
                        let speedText = "";
                        if (bps > 1024 * 1024) {
                            speedText = (bps / (1024 * 1024)).toFixed(2) + " MB/s";
                        } else if (bps > 1024) {
                            speedText = (bps / 1024).toFixed(0) + " KB/s";
                        } else {
                            speedText = Math.round(bps) + " B/s";
                        }

                        // 3. Изчисляване на оставащо време (ETA)
                        const remainingBytes = file.size - bytesSent;
                        const secondsLeft = remainingBytes / bps;
                        let etaText = "Остава: ";

                        if (secondsLeft > 60) {
                            etaText += Math.floor(secondsLeft / 60) + "m " + Math.round(secondsLeft % 60) + "s";
                        } else if (secondsLeft > 0) {
                            etaText += Math.round(secondsLeft) + "s";
                        } else {
                            etaText = "Финализиране...";
                        }

                        // 4. ПОКАЗВАНЕ В ИНТЕРФЕЙСА
                        const speedEl = el.querySelector(".dz-speed");
                        const etaEl = el.querySelector(".dz-eta");

                        if (speedEl) {
                            speedEl.textContent = speedText;
                            speedEl.style.display = "inline-block"; // Показваме го, ако е бил скрит
                        }
                        if (etaEl) {
                            etaEl.textContent = etaText;
                        }
                    }
                }

                // 5. При 100% скриваме скоростта, защото реалното качване е спряло
                if (progress >= 100) {
                    const speedEl = el.querySelector(".dz-speed");
                    const etaEl = el.querySelector(".dz-eta");
                    if (speedEl) speedEl.style.display = "none";
                    if (etaEl) etaEl.textContent = "Обработка на сървъра...";
                }
            });

            this.on("success", function(file) {
                const el = file.previewElement;
                el.classList.add("border-emerald-200", "bg-emerald-50");
                el.querySelector(".dz-status").innerHTML = '<span class="text-emerald-600 font-bold"><i class="fa-solid fa-check"></i> Завършено</span>';
                el.querySelector(".dz-speed").style.display = "none";
                el.querySelector(".dz-eta").style.display = "none";
            });

            this.on("error", function(file, message) {
                const el = file.previewElement;
                el.classList.add("border-red-200", "bg-red-50");
                el.querySelector(".dz-status").innerHTML = '<span class="text-red-600 font-bold text-xs">' + message + '</span>';
            });
        }
    });
</script>