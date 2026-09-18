<div class="w-full min-h-full" id="video-list-page">
    <div class="mb-5 flex items-center justify-between gap-4">
        <h1 class="text-xl md:text-2xl md:font-bold text-slate-900">Видеоклипове</h1>
        <a href="/admin/videos/create" class="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"><i class="fa-solid fa-plus"></i> Ново видео</a>
    </div>

    <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 class="font-bold text-slate-900">Списък с видеоклипове</h2>
            <button id="refresh-videos" type="button" class="rounded-lg p-2 text-slate-400 transition hover:bg-slate-50 hover:text-primary" title="Обнови"><i class="fa-solid fa-rotate"></i></button>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full min-w-[680px] border-collapse text-left">
                <thead><tr class="border-b border-slate-100 bg-slate-50/70 text-xs font-bold uppercase tracking-wide text-slate-500"><th class="px-5 py-3">Видео</th><th class="px-5 py-3">Описание</th><th class="px-5 py-3">Статус</th><th class="px-5 py-3">Размер / време</th><th class="px-5 py-3">Гледания</th><th class="px-5 py-3">Дата</th><th class="px-5 py-3 text-right">Действия</th></tr></thead>
                <tbody id="video-list"><tr><td colspan="5" class="px-5 py-8 text-center text-sm text-slate-400">Зареждане…</td></tr></tbody>
            </table>
        </div>
    </div>
</div>

<script>
(() => {
    const list = document.getElementById('video-list');
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
    async function loadVideos() {
        try {
            const response = await fetch('/admin/videos/data', { headers: { Accept: 'application/json' } });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
            const videos = data.data || [];
            const formatSize = bytes => { if (!bytes) return '—'; const units = ['B', 'KB', 'MB', 'GB']; let size = bytes; let unit = 0; while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit++; } return `${size.toFixed(unit ? 1 : 0)} ${units[unit]}`; };
            const formatDuration = seconds => { if (!seconds) return '—'; return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; };
            list.innerHTML = videos.length ? videos.map(video => `<tr class="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50">
                <td class="px-5 py-3"><a href="/admin/videos/edit/${encodeURIComponent(video.id)}" class="flex items-center gap-3 group">
                    <span class="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 text-primary">${video.thumbnail_url ? `<img src="${escapeHtml(video.thumbnail_url)}" alt="" class="h-full w-full object-cover">` : '<i class="fa-solid fa-video"></i>'}</span>
                    <span class="min-w-0"><span class="block max-w-xs truncate font-medium text-slate-900 group-hover:text-primary">${escapeHtml(video.title || 'Без заглавие')}</span><span class="block text-[11px] text-slate-400">Видео #${escapeHtml(video.id)}</span></span>
                </a></td>
                <td class="max-w-xs truncate px-5 py-3 text-sm text-slate-600">${escapeHtml(video.description || '—')}</td>
                <td class="px-5 py-3"><span class="inline-flex items-center gap-1.5 rounded-md border ${video.status === 'ready' ? 'border-emerald-100 bg-emerald-50 text-emerald-600' : 'border-amber-100 bg-amber-50 text-amber-600'} px-2.5 py-1 text-xs font-semibold"><i class="fa-solid ${video.status === 'ready' ? 'fa-circle-check' : 'fa-lock'}"></i>${escapeHtml(video.status || '—')}</span></td>
                <td class="whitespace-nowrap px-5 py-3 text-xs text-slate-500">${formatSize(video.file_size)}<br><span class="text-slate-400">${formatDuration(video.duration_seconds)}</span></td>
                <td class="whitespace-nowrap px-5 py-3 text-xs text-slate-500">${escapeHtml(video.total_views || 0)} <span class="text-slate-400">(${escapeHtml(video.unique_viewers || 0)} уникални)</span></td>
                <td class="whitespace-nowrap px-5 py-3 text-xs font-mono text-slate-400">${video.created_at ? new Date(video.created_at).toLocaleString('bg-BG') : '—'}</td>
                <td class="px-5 py-3"><div class="flex justify-end gap-1"><a href="/admin/videos/edit/${encodeURIComponent(video.id)}" class="p-2 text-slate-400 hover:text-primary" title="Редактирай"><i class="fa-solid fa-pen text-sm"></i></a><button data-delete="${escapeHtml(video.id)}" type="button" class="p-2 text-slate-400 hover:text-red-500" title="Изтрий"><i class="fa-solid fa-trash text-sm"></i></button></div></td>
            </tr>`).join('') : '<tr><td colspan="7" class="px-5 py-8 text-center text-sm text-slate-400">Няма добавени видеоклипове.</td></tr>';
        } catch (error) { list.innerHTML = `<tr><td colspan="7" class="px-5 py-8 text-center text-sm text-red-500">${escapeHtml(error.message)}</td></tr>`; }
    }
    list.addEventListener('click', async event => {
        const button = event.target.closest('[data-delete]');
        if (!button || !confirm('Изтриване на видеоклипа?')) return;
        try { await api(`/api/mobile/videos/${button.dataset.delete}`, { method: 'DELETE' }); await loadVideos(); }
        catch (error) { alert(error.message); }
    });
    document.getElementById('refresh-videos').addEventListener('click', loadVideos);
    getToken().then(loadVideos).catch(error => { list.innerHTML = `<tr><td colspan="7" class="px-5 py-8 text-center text-sm text-red-500">${escapeHtml(error.message)}</td></tr>`; });
})();
</script>
