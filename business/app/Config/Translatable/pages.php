<?php

return [
    'home' => [
        'title' => [
            'id'    => 'home-trans-title',
            'type'  => 'text',
            'label' => 'Заглавие на страницата',
            'help'  => 'Основно заглавие (H1), което се вижда в страницата.'
        ],
        'content' => [
            'id'    => 'home-trans-editor',
            'type'  => 'editor',
            'label' => 'Основно съдържание',
            'help'  => 'Използвайте редактора за форматиране на текста.'
        ],
        'meta_title' => [
            'id'    => 'home-trans-meta-title',
            'type'  => 'text',
            'label' => 'SEO Заглавие',
            'help'  => 'Показва се в таба на браузъра и Google.'
        ],
        'meta_description' => [
            'id'    => 'home-trans-meta-desc',
            'type'  => 'textarea',
            'label' => 'SEO Описание',
            'help'  => 'Кратко резюме до 160 символа.'
        ]
    ],
    'about' => [
        // Конфигурация за страница "За нас"...
    ]
];
