<!DOCTYPE html>
<html lang="bg" class="scroll-smooth">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $title ?? 'Грешка - KRISKATA' ?></title>

    <link rel="stylesheet" href="/assets/css/min/tailwind.css">
    <link rel="stylesheet" href="/assets/css/min/font-awesome.all.min.css" />

    <script>
        if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    </script>
</head>

<body class="antialiased text-gray-900 dark:text-white bg-white dark:bg-slate-900 flex flex-col min-h-screen">

    <nav class="py-6 border-b border-slate-100 dark:border-white/5">
        <div class="container mx-auto px-4 flex justify-between items-center">
            <a href="/" class="block">
                <img src="/assets/images/logo.webp" alt="Logo" class="h-12 w-auto dark:hidden">
                <img src="/assets/images/logo-dark-mode.webp" alt="Logo Dark" class="h-12 w-auto hidden dark:block">
            </a>
            <a href="/" class="text-sm font-bold uppercase tracking-widest hover:text-indigo-600 transition-colors">
                <i class="fa-solid fa-house mr-2"></i> Начало
            </a>
        </div>
    </nav>

    <main class="grow flex items-center justify-center py-20 relative overflow-hidden">
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-indigo-600/5 dark:bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none"></div>

        <div class="container mx-auto px-4 relative z-10">
            <?= $content ?>
        </div>
    </main>

    <footer class="py-10 border-t border-slate-100 dark:border-white/5">
        <div class="container mx-auto px-4 text-center">
            <p class="text-slate-500 text-sm font-medium">
                © <?= date('Y') ?> KRISKATA.COM. Системно съобщение.
            </p>
        </div>
    </footer>

</body>

</html>
