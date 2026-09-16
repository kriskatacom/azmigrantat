<?php
$unique_id = $unique_id ?? 'pp_' . uniqid();
?>

<div class="overflow-hidden group w-full opacity-0 translate-y-4 transition-all duration-700 ease-out" id="parent_<?= $unique_id ?>">
    <div id="container_<?= $unique_id ?>" class="flex items-center w-max">
        <?= $content ?>
    </div>
</div>

<script>
    (function() {
        const init = () => {
            const container = document.getElementById('container_<?= $unique_id ?>');
            const parent = document.getElementById('parent_<?= $unique_id ?>');
            if (!container || !parent) return;

            setTimeout(() => {
                parent.classList.remove('opacity-0', 'translate-y-4');
                parent.classList.add('opacity-100', 'translate-y-0');
            }, 100);

            const cards = container.children;
            Array.from(cards).forEach((card, index) => {
                card.style.opacity = '0';
                card.style.transform = 'scale(0.95)';
                card.style.transition = `all 0.5s ease-out ${index * 0.1}s`;
                
                requestAnimationFrame(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'scale(1)';
                });
            });

            container.classList.remove('animate_<?= $unique_id ?>');
            container.style.transform = 'translateX(0)';

            const scrollWidth = container.scrollWidth;
            const visibleWidth = parent.clientWidth;
            const hasMultipleItems = cards.length > 1;

            if (hasMultipleItems && scrollWidth > visibleWidth) {
                const distance = visibleWidth - scrollWidth;
                const styleId = 'style_<?= $unique_id ?>';
                let styleTag = document.getElementById(styleId) || document.createElement('style');

                styleTag.id = styleId;
                styleTag.innerHTML = `
                    @keyframes anim_<?= $unique_id ?> {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(${distance}px); }
                    }
                    .animate_<?= $unique_id ?> {
                        /* Изчакваме "show" ефекта да приключи преди да започне скролването */
                        animation: anim_<?= $unique_id ?> ${Math.abs(distance) / 50}s linear infinite alternate !important;
                        animation-delay: 1s; 
                    }
                `;
                if (!document.getElementById(styleId)) document.head.appendChild(styleTag);
                
                setTimeout(() => {
                    container.classList.add('animate_<?= $unique_id ?>');
                }, 500);
            } else {
                if (!hasMultipleItems || scrollWidth <= visibleWidth) {
                    container.style.width = '100%';
                    container.style.justifyContent = 'center';
                }
            }
        };

        if (document.readyState === 'complete') {
            init();
        } else {
            window.addEventListener('load', init);
        }
        window.addEventListener('resize', init);
    })();
</script>

<style>
    #parent_<?= $unique_id ?>:hover #container_<?= $unique_id ?> {
        animation-play-state: paused !important;
    }

    #container_<?= $unique_id ?> {
        will-change: transform;
        transition: justify-content 0.3s ease;
    }
    
    #container_<?= $unique_id ?> > * {
        backface-visibility: hidden;
    }
</style>