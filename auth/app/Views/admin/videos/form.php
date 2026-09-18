<?php
use App\Modules\Form;

$editing = !empty($videoId);
?>
<div class="w-full min-h-full" id="video-form-page">
    <div class="mb-6">
        <a href="/admin/videos" class="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary"><i class="fa-solid fa-arrow-left"></i> Всички видеоклипове</a>
        <h2 class="mt-4 text-3xl font-black text-slate-900"><?= $editing ? 'Редактиране на видео' : 'Ново видео' ?></h2>
        <p class="mt-1 text-slate-500"><?= $editing ? 'Промени заглавието, описанието или основното изображение.' : 'Добави видео публикация към своя профил.' ?></p>
    </div>

    <form id="video-form" class="w-full max-w-5xl space-y-5">
        <?php Form::section('Основна информация', function () { ?>
            <label class="block">
                <span class="mb-2 block text-sm font-semibold text-slate-700">Заглавие</span>
                <input id="video-title" maxlength="120" required class="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="Например: Разходка из града">
            </label>

            <label class="mt-5 block">
                <span class="mb-2 block text-sm font-semibold text-slate-700">Описание</span>
                <textarea id="video-description" maxlength="2000" rows="6" class="w-full resize-y rounded-lg border border-slate-200 bg-white px-4 py-2 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="Разкажи накратко за видеото..."></textarea>
            </label>
        <?php }, 'fa-circle-info'); ?>

        <?php if (!$editing): ?>
        <?php Form::section('Видео файл', function () { ?>
        <label class="block cursor-pointer rounded-3xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-indigo-50 p-4 text-center transition hover:border-primary hover:bg-primary/10 sm:p-6">
            <input id="video-file" type="file" accept="video/mp4,video/quicktime,video/webm,video/x-m4v" required class="hidden">
            <div id="video-preview" class="mx-auto flex aspect-[9/16] w-full max-w-sm items-center justify-center overflow-hidden rounded-2xl bg-primary text-white shadow-lg shadow-primary/20"><i class="fa-solid fa-cloud-arrow-up text-3xl"></i></div>
            <span id="video-file-label" class="mt-4 block text-base font-bold text-slate-800">Избери видео файл</span>
            <span class="mt-2 block text-xs text-slate-500">MP4, MOV, M4V или WebM · максимум 2 GB</span>
        </label>
        <?php }, 'fa-video'); ?>
        <?php else: ?>
        <?php Form::section('Видео файл', function () { ?>
            <div id="current-video" class="hidden space-y-3"></div>
        <?php }, 'fa-video'); ?>
        <?php endif; ?>

        <?php Form::section('Основно изображение', function () use ($editing) { ?>
        <label class="block cursor-pointer rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center transition hover:border-primary hover:bg-primary/5 sm:p-6">
            <input id="video-thumbnail" type="file" accept="image/*" class="hidden">
            <div id="thumbnail-preview" class="mx-auto flex aspect-[9/16] w-full max-w-sm items-center justify-center overflow-hidden rounded-2xl bg-white text-primary shadow-sm"><i class="fa-solid fa-image text-3xl"></i></div>
            <span id="thumbnail-label" class="mt-4 block text-base font-bold text-slate-800"><?= $editing ? 'Смени основното изображение' : 'Добави основно изображение' ?></span>
            <span class="mt-2 block text-xs text-slate-500">По желание · изображение до 5 MB</span>
        </label>
        <?php }, 'fa-image'); ?>

        <div id="form-status" class="hidden rounded-2xl px-4 py-3 text-sm"></div>
        <div id="upload-area" class="<?= $editing ? 'hidden' : '' ?>">
            <div class="mb-2 flex justify-between text-sm"><span id="upload-status" class="font-medium text-slate-500">Готово за качване</span><span id="upload-percent" class="font-bold text-primary">0%</span></div>
            <div class="h-3 overflow-hidden rounded-full bg-slate-100"><div id="upload-progress" class="h-full w-0 rounded-full bg-gradient-to-r from-primary to-indigo-500 transition-all"></div></div>
        </div>
        <button id="form-submit" type="submit" class="w-full rounded-lg bg-primary px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-50"><?= $editing ? 'Запази промените' : 'Качи видеото' ?></button>
    </form>
</div>

<script>
(() => {
    const videoId = <?= (int) ($videoId ?? 0) ?>;
    const form = document.getElementById('video-form');
    const title = document.getElementById('video-title');
    const description = document.getElementById('video-description');
    const thumbnailInput = document.getElementById('video-thumbnail');
    const submit = document.getElementById('form-submit');
    const message = document.getElementById('form-status');
    let accessToken = null;
    const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[char]));
    async function getToken() {
        const response = await fetch('/admin/videos/session-token', { headers: { Accept: 'application/json' } });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.access_token) throw new Error(data.message || 'Необходим е вход в профила.');
        accessToken = data.access_token;
    }
    async function api(url, options = {}) {
        const response = await fetch(url, { ...options, headers: { Accept: 'application/json', ...(options.headers || {}), Authorization: `Bearer ${accessToken}` } });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
        return data;
    }
    function showMessage(text, error = false) {
        message.textContent = text; message.className = `rounded-2xl px-4 py-3 text-sm ${error ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`;
    }
    function setProgress(value, text) {
        document.getElementById('upload-percent').textContent = `${value}%`;
        document.getElementById('upload-progress').style.width = `${value}%`;
        if (text) document.getElementById('upload-status').textContent = text;
    }
    async function tusUpload(file, upload) {
        const headers = { AuthorizationSignature: upload.authorization_signature, AuthorizationExpire: String(upload.authorization_expire), LibraryId: String(upload.library_id), VideoId: upload.video_id, 'Tus-Resumable': '1.0.0' };
        const start = await fetch(upload.endpoint, { method: 'POST', headers: { ...headers, 'Upload-Length': String(file.size), 'Upload-Metadata': `filetype ${btoa(file.type || 'video/mp4')}` } });
        if (!start.ok) throw new Error(`Bunny upload initialization failed (${start.status})`);
        let location = start.headers.get('Location');
        if (!location) throw new Error('Bunny не върна адрес за качване.');
        location = new URL(location, upload.endpoint).href;
        let offset = 0; const chunkSize = 1024 * 1024;
        while (offset < file.size) {
            const chunk = file.slice(offset, Math.min(offset + chunkSize, file.size));
            const response = await fetch(location, { method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/offset+octet-stream', 'Upload-Offset': String(offset) }, body: chunk });
            if (!response.ok) throw new Error(`Bunny upload failed (${response.status})`);
            offset = Number(response.headers.get('Upload-Offset') || offset + chunk.size);
            setProgress(Math.floor(offset / file.size * 95), 'Качване на видеото…');
        }
    }
    function showImage(file) {
        if (file) { document.getElementById('thumbnail-label').textContent = file.name; document.getElementById('thumbnail-preview').innerHTML = `<img src="${URL.createObjectURL(file)}" class="h-full w-full object-cover" alt="Избрано изображение">`; }
    }
    thumbnailInput.addEventListener('change', () => showImage(thumbnailInput.files[0]));
    <?php if (!$editing): ?>
    const fileInput = document.getElementById('video-file');
    fileInput.addEventListener('change', () => { const file = fileInput.files[0]; if (!file) return; document.getElementById('video-file-label').textContent = file.name; if (!title.value.trim()) title.value = file.name.replace(/\.[^.]+$/, ''); document.getElementById('video-preview').innerHTML = `<video src="${URL.createObjectURL(file)}" class="h-full w-full object-contain" muted controls></video>`; });
    <?php else: ?>
    async function loadVideo() { const response = await fetch('/admin/videos/data', { headers: { Accept: 'application/json' } }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`); const video = (data.data || []).find(item => Number(item.id) === videoId); if (!video) throw new Error('Видеоклипът не е намерен.'); title.value = video.title || ''; description.value = video.description || ''; const current = document.getElementById('current-video'); current.innerHTML = `<div class="text-sm text-slate-600">Текущ видеоклип: <strong>${escapeHtml(video.title || 'Без заглавие')}</strong> · статус: ${escapeHtml(video.status || '—')}</div>`; if (video.status === 'ready') { try { if (!accessToken) await getToken(); const playback = await api(`/api/mobile/videos/${videoId}/playback`); if (playback.data?.url) current.insertAdjacentHTML('afterbegin', `<div class="aspect-[9/16] w-full max-w-sm overflow-hidden rounded-2xl bg-black shadow-sm"><video src="${escapeHtml(playback.data.url)}" class="h-full w-full object-contain" controls playsinline preload="metadata"></video></div>`); } catch (_) {} } else { current.insertAdjacentHTML('afterbegin', '<div class="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700"><i class="fa-solid fa-lock mr-2"></i>Видеото е заключено, докато обработката не завърши.</div>'); } current.classList.remove('hidden'); if (video.thumbnail_url) { document.getElementById('thumbnail-preview').innerHTML = `<img src="${escapeHtml(video.thumbnail_url)}" class="h-full w-full object-cover" alt="Текущо изображение">`; } }
    <?php endif; ?>
    form.addEventListener('submit', async event => {
        event.preventDefault(); submit.disabled = true;
        try {
            if (!accessToken) await getToken();
            const thumbnail = thumbnailInput.files[0];
            if (videoId) {
                await api(`/api/mobile/videos/${videoId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title.value.trim(), description: description.value.trim() }) });
                if (thumbnail) { const body = new FormData(); body.append('thumbnail', thumbnail); await api(`/api/mobile/videos/${videoId}/thumbnail`, { method: 'POST', body }); }
                showMessage('Промените са записани.');
            } else {
                const file = fileInput.files[0]; if (!file) throw new Error('Избери видео файл.');
                setProgress(1, 'Подготовка…');
                const initialized = await api('/api/mobile/videos/uploads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title.value.trim() || file.name, description: description.value.trim(), filename: file.name, mime_type: file.type || 'video/mp4', file_size: file.size }) });
                await tusUpload(file, initialized.data.upload); setProgress(97, 'Обработка…');
                await api(`/api/mobile/videos/${initialized.data.video.id}/upload-complete`, { method: 'POST' });
                if (thumbnail) { const body = new FormData(); body.append('thumbnail', thumbnail); await api(`/api/mobile/videos/${initialized.data.video.id}/thumbnail`, { method: 'POST', body }); }
                setProgress(100, 'Качването завърши.'); showMessage('Видеото е добавено.'); setTimeout(() => { window.location.href = '/admin/videos'; }, 700);
            }
        } catch (error) { showMessage(error.message, true); } finally { submit.disabled = false; }
    });
    getToken().then(() => { <?php if ($editing): ?> return loadVideo(); <?php endif; ?> }).catch(error => showMessage(error.message, true));
})();
</script>
