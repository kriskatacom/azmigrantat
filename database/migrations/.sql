CREATE TABLE
    `users` (
        `id` CHAR(36) NOT NULL PRIMARY KEY, -- UUID
        `email` VARCHAR(255) NOT NULL UNIQUE, -- Имейл
        `email_verified` BOOLEAN NOT NULL DEFAULT FALSE, -- Потвърден имейл
        `password_hash` VARCHAR(255) NOT NULL, -- Хеш на паролата
        `name` VARCHAR(255) NOT NULL, -- Пълно име
        `username` VARCHAR(50) UNIQUE, -- Опционален уникален username
        `role` ENUM ('user', 'moderator', 'admin') NOT NULL DEFAULT 'user', -- Роля
        `profile_image` TEXT, -- URL към снимка
        `bio` TEXT, -- Кратка биография
        `last_login` DATETIME (3) DEFAULT NULL, -- Последно влизане
        `is_active` BOOLEAN NOT NULL DEFAULT TRUE, -- Активен потребител
        `deleted_at` DATETIME (3) DEFAULT NULL, -- Soft delete
        `created_at` DATETIME (3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        `updated_at` DATETIME (3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        -- Индекси
        INDEX `users_email_idx` (`email`),
        INDEX `users_username_idx` (`username`),
        INDEX `users_role_idx` (`role`)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

ALTER TABLE `banners` ADD `show_name` TINYINT (1) NOT NULL DEFAULT 1 AFTER `sort_order`,
ADD `show_description` TINYINT (1) NOT NULL DEFAULT 1 AFTER `show_name`,
ADD `show_overlay` TINYINT (1) NOT NULL DEFAULT 1 AFTER `show_description`,
ADD `content_place` ENUM (
    'top_left',
    'top_right',
    'top_center',
    'center_right',
    'bottom_right',
    'bottom_center',
    'bottom_left',
    'center_left',
    'center_center'
) NOT NULL DEFAULT 'center_center' AFTER `show_overlay`;

ALTER TABLE `banners` ADD `show_button` TINYINT (1) NOT NULL DEFAULT '1' AFTER `content_place`,
ADD `href` VARCHAR(512) NULL AFTER `show_button`,
ADD `button_text` VARCHAR(20) NOT NULL AFTER `href`;