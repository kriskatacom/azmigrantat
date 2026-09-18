<div class="max-w-4xl mx-auto border-t border-gray-200 dark:border-gray-700/60 p-2 md:p-5 space-y-4">
    <h3 class="text-xl font-semibold text-gray-900 dark:text-white text-center md:text-left">Видеоклипове</h3>

    <?php if (!empty($videos)): ?>
        <div class="profile-videos-grid grid gap-3 md:gap-4">
            <?php foreach ($videos as $video): ?>
                <a href="/?video=<?= urlencode((string) ($video['id'] ?? '')) ?>"
                   class="group overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                    <div class="profile-video-media relative overflow-hidden bg-gray-950">
                        <?php if (!empty($video['thumbnail_url'])): ?>
                            <img src="<?= htmlspecialchars($video['thumbnail_url']) ?>"
                                 class="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                 alt="<?= htmlspecialchars($video['title'] ?? 'Видео') ?>"
                                 loading="lazy">
                        <?php else: ?>
                            <div class="flex h-full items-center justify-center text-gray-400">
                                <i class="fa-solid fa-video text-2xl"></i>
                            </div>
                        <?php endif; ?>
                        <span class="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white">
                            <i class="fa-solid fa-eye mr-1"></i><?= (int) ($video['total_views'] ?? 0) ?>
                        </span>
                    </div>
                    <div class="p-3">
                        <h4 class="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white">
                            <?= htmlspecialchars($video['title'] ?: 'Видео') ?>
                        </h4>
                    </div>
                </a>
            <?php endforeach; ?>
        </div>
    <?php else: ?>
        <div class="rounded-xl border border-dashed border-gray-200 bg-gray-50 py-8 text-center text-gray-500 dark:border-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
            Няма добавени видеоклипове от този потребител.
        </div>
    <?php endif; ?>
</div>

<style>
    .profile-videos-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .profile-video-media {
        height: 280px;
    }

    @media (min-width: 768px) {
        .profile-videos-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .profile-video-media {
            height: 360px;
        }
    }
</style>
