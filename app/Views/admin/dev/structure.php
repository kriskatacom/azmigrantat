<?php
$excludeOptions = ['vendor', 'app', 'public', 'assets', 'storage', 'node_modules'];
?>

<div class="max-w-5xl mx-auto my-10 p-6 bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 font-mono">
    <div class="border-b border-slate-800 pb-6 mb-6">
        <div class="flex items-center justify-between mb-6">
            <h1 class="text-emerald-400 text-xl font-bold flex items-center gap-3">
                <i class="fa-solid fa-sitemap"></i> Project Explorer
            </h1>
            <button onclick="copyStructure()" class="bg-emerald-500 hover:bg-emerald-600 text-slate-900 px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-lg shadow-emerald-500/20">
                <i class="fa-solid fa-copy mr-2"></i> Копирай
            </button>
        </div>

        <div class="flex flex-wrap gap-4 items-center justify-between">
            <div class="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button onclick="filterView('all')" class="nav-btn active px-4 py-2 rounded-lg text-xs font-bold transition-all" data-type="all">Всички</button>
                <button onclick="filterView('php')" class="nav-btn px-4 py-2 rounded-lg text-xs font-bold transition-all" data-type="php">Папки + PHP</button>
                <button onclick="filterView('folders')" class="nav-btn px-4 py-2 rounded-lg text-xs font-bold transition-all" data-type="folders">Само папки</button>
            </div>

            <div class="flex flex-wrap gap-2">
                <span class="text-slate-500 text-[10px] uppercase font-bold self-center mr-2">Изключи:</span>
                <?php foreach ($excludeOptions as $opt): ?>
                    <label class="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors border border-slate-700">
                        <input type="checkbox" class="exclude-check hidden" value="<?= $opt ?>" onchange="toggleFolder('<?= $opt ?>', this)">
                        <span class="check-indicator w-3 h-3 border border-slate-500 rounded-sm"></span>
                        <span class="text-xs text-slate-300"><?= $opt ?>/</span>
                    </label>
                <?php endforeach; ?>
            </div>
        </div>
    </div>

    <div id="tree-container" class="text-sm leading-relaxed text-slate-300 p-4 bg-slate-950/50 rounded-xl border border-slate-800/50 min-h-100">
        <?php foreach ($structure as $file):
            $parts = explode(DIRECTORY_SEPARATOR, $file['relative']);
            $depth = count($parts) - 1;
            $name = end($parts);
            $rootFolder = $parts[0] ?? '';

            $filterClass = "file-row ";
            if ($file['is_dir']) $filterClass .= "is-folder ";
            if ($file['extension'] === 'php') $filterClass .= "is-php ";
        ?>
            <div class="<?= $filterClass ?> flex items-center hover:bg-slate-800/50 py-0.5 px-2 rounded group transition-all"
                data-depth="<?= $depth ?>"
                data-root="<?= $rootFolder ?>"
                data-copy-text="<?= str_repeat("    ", $depth) . ($file['is_dir'] ? "📁 " : "📄 ") . $name ?>">

                <?= str_repeat('<span class="text-slate-800 ml-4 border-l border-slate-800 h-5 inline-block"></span>', $depth) ?>

                <span class="inline-block transition-transform group-hover:translate-x-1">
                    <?= $file['is_dir'] ? '<i class="fa-solid fa-folder text-blue-400 mr-2"></i>' : getFileIcon($name) ?>
                    <span class="<?= $file['is_dir'] ? 'text-blue-100 font-semibold' : 'text-slate-400' ?>"><?= htmlspecialchars($name) ?></span>
                </span>
            </div>
        <?php endforeach; ?>
    </div>
</div>

<style>
    .nav-btn {
        color: #64748b;
    }

    .nav-btn.active {
        background: #10b981;
        color: #020617;
    }

    .file-row.hidden,
    .file-row.excluded {
        display: none;
    }

    .exclude-check:checked+.check-indicator {
        background: #ef4444;
        border-color: #ef4444;
        position: relative;
    }

    .exclude-check:checked+.check-indicator::after {
        content: '✕';
        color: white;
        font-size: 8px;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }

    .exclude-check:checked~span {
        color: #ef4444;
        text-decoration: line-through;
    }
</style>

<script>
    let currentViewMode = 'all';

    function filterView(type) {
        currentViewMode = type;
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-type="${type}"]`).classList.add('active');
        applyFilters();
    }

    function toggleFolder(folderName, checkbox) {
        applyFilters();
    }

    function applyFilters() {
        const excludedFolders = Array.from(document.querySelectorAll('.exclude-check:checked')).map(c => c.value);
        const rows = document.querySelectorAll('.file-row');

        rows.forEach(row => {
            const root = row.getAttribute('data-root');

            row.classList.remove('hidden', 'excluded');

            if (excludedFolders.includes(root)) {
                row.classList.add('excluded');
                return;
            }

            if (currentViewMode === 'folders' && !row.classList.contains('is-folder')) {
                row.classList.add('hidden');
            } else if (currentViewMode === 'php' && !row.classList.contains('is-folder') && !row.classList.contains('is-php')) {
                row.classList.add('hidden');
            }
        });
    }

    function copyStructure() {
        const visibleItems = Array.from(document.querySelectorAll('.file-row:not(.hidden):not(.excluded)'));
        const textStructure = visibleItems.map(item => item.getAttribute('data-copy-text')).join('\n');

        navigator.clipboard.writeText(textStructure).then(() => {
            alert('Структурата е копирана успешно!');
        });
    }
</script>