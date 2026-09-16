SET
	FOREIGN_KEY_CHECKS = 0;

CREATE TABLE
	`articles` (
		`id` int UNSIGNED NOT NULL,
		`category_id` int UNSIGNED DEFAULT NULL,
		`title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
		`slug` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
		`excerpt` text COLLATE utf8mb4_unicode_ci,
		`content` longtext COLLATE utf8mb4_unicode_ci,
		`image` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
		`status` enum ('draft', 'published', 'scheduled') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
		`options` json DEFAULT NULL,
		`published_at` timestamp NULL DEFAULT NULL,
		`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
		`deleted_at` timestamp NULL DEFAULT NULL
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
	`article_tag` (
		`article_id` int UNSIGNED NOT NULL,
		`tag_id` int UNSIGNED NOT NULL,
		`created_at` timestamp NULL DEFAULT NULL,
		`updated_at` timestamp NULL DEFAULT NULL
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
	`categories` (
		`id` int UNSIGNED NOT NULL,
		`name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
		`slug` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
		`description` text COLLATE utf8mb4_unicode_ci,
		`sort_order` int DEFAULT '0',
		`options` json DEFAULT NULL,
		`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
		`deleted_at` timestamp NULL DEFAULT NULL
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
	`galleries` (
		`id` int UNSIGNED NOT NULL,
		`user_id` int UNSIGNED DEFAULT NULL,
		`slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
		`payload` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
		`description` text COLLATE utf8mb4_unicode_ci,
		`user_agent` text COLLATE utf8mb4_unicode_ci,
		`is_active` tinyint (1) DEFAULT '1',
		`last_activity` int UNSIGNED DEFAULT NULL,
		`created_at` datetime DEFAULT NULL,
		`updated_at` datetime DEFAULT NULL,
		`deleted_at` datetime DEFAULT NULL
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
	`gallery_media` (
		`gallery_id` int UNSIGNED NOT NULL,
		`media_id` int UNSIGNED NOT NULL,
		`sort_order` int UNSIGNED DEFAULT '0'
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
	`media` (
		`id` int UNSIGNED NOT NULL,
		`file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
		`file_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
		`file_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
		`file_size` int UNSIGNED NOT NULL,
		`alt_text` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
		`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		`deleted_at` timestamp NULL DEFAULT NULL
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
	`menus` (
		`id` int UNSIGNED NOT NULL,
		`title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
		`slug` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
		`description` text COLLATE utf8mb4_unicode_ci,
		`created_at` datetime (3) DEFAULT NULL,
		`updated_at` datetime (3) DEFAULT NULL,
		`deleted_at` datetime (3) DEFAULT NULL
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
	`menu_items` (
		`id` int UNSIGNED NOT NULL,
		`menu_id` int UNSIGNED DEFAULT NULL,
		`parent_id` int UNSIGNED DEFAULT NULL,
		`page_id` int UNSIGNED DEFAULT NULL,
		`title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
		`url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
		`target` enum ('_self', '_blank') COLLATE utf8mb4_unicode_ci DEFAULT '_self',
		`order_index` int DEFAULT '0',
		`is_active` tinyint (1) DEFAULT '1',
		`created_at` datetime (3) DEFAULT NULL,
		`updated_at` datetime (3) DEFAULT NULL
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
	`pages` (
		`id` int UNSIGNED NOT NULL,
		`parent_id` int UNSIGNED DEFAULT NULL,
		`title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
		`slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
		`custom_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
		`content` longtext COLLATE utf8mb4_unicode_ci,
		`template` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'default',
		`view_name` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
		`seo` json DEFAULT NULL,
		`options` json DEFAULT NULL,
		`menu_order` int DEFAULT '0',
		`image_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
		`is_active` tinyint (1) DEFAULT '1',
		`created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		`deleted_at` timestamp NULL DEFAULT NULL
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
	`page_elements` (
		`id` int UNSIGNED NOT NULL,
		`key_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
		`label` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
		`section_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'Общи',
		`type` enum ('text', 'editor', 'textarea', 'image', 'gallery') COLLATE utf8mb4_unicode_ci DEFAULT 'text',
		`value` longtext COLLATE utf8mb4_unicode_ci,
		`sort_order` int DEFAULT '0',
		`is_active` tinyint (1) DEFAULT '1',
		`help_text` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
		`page_id` int DEFAULT NULL
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
	`page_element_values` (
		`id` int UNSIGNED NOT NULL,
		`page_id` int DEFAULT NULL,
		`element_id` int UNSIGNED DEFAULT NULL,
		`value` text COLLATE utf8mb4_unicode_ci,
		`created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
	`phinxlog` (
		`version` bigint NOT NULL,
		`migration_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
		`start_time` timestamp NULL DEFAULT NULL,
		`end_time` timestamp NULL DEFAULT NULL,
		`breakpoint` tinyint (1) NOT NULL DEFAULT '0'
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
	`redirects` (
		`id` int UNSIGNED NOT NULL,
		`old_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
		`new_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
		`status_code` int DEFAULT '301',
		`category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
		`description` text COLLATE utf8mb4_unicode_ci,
		`hits_count` int UNSIGNED DEFAULT '0',
		`last_used_at` timestamp NULL DEFAULT NULL,
		`is_active` tinyint (1) DEFAULT '1',
		`user_id` int UNSIGNED DEFAULT NULL,
		`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
		`deleted_at` timestamp NULL DEFAULT NULL
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
	`sessions` (
		`id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
		`user_id` int DEFAULT NULL,
		`ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
		`user_agent` text COLLATE utf8mb4_unicode_ci,
		`payload` text COLLATE utf8mb4_unicode_ci,
		`last_activity` int DEFAULT NULL
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
	`tags` (
		`id` int UNSIGNED NOT NULL,
		`name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
		`slug` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
		`color` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
		`options` json DEFAULT NULL,
		`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
		`deleted_at` timestamp NULL DEFAULT NULL
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
	`translations` (
		`id` int UNSIGNED NOT NULL,
		`lang_code` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL,
		`translation_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
		`translation_value` text COLLATE utf8mb4_unicode_ci NOT NULL,
		`source` ENUM('static','dynamic') NOT NULL DEFAULT 'dynamic',
		`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
		`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
	`users` (
		`id` int UNSIGNED NOT NULL,
		`email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
		`password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
		`name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
		`username` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
		`role` enum ('user', 'admin', 'moderator') COLLATE utf8mb4_unicode_ci DEFAULT 'user',
		`options` json DEFAULT NULL,
		`last_login` datetime (3) DEFAULT NULL,
		`is_active` tinyint (1) DEFAULT '1',
		`created_at` datetime (3) DEFAULT NULL,
		`updated_at` datetime (3) DEFAULT NULL,
		`deleted_at` datetime (3) DEFAULT NULL
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

ALTER TABLE `articles` ADD PRIMARY KEY (`id`),
ADD UNIQUE KEY `slug` (`slug`),
ADD KEY `category_id` (`category_id`);

ALTER TABLE `article_tag` ADD PRIMARY KEY (`article_id`, `tag_id`),
ADD KEY `tag_id` (`tag_id`);

ALTER TABLE `categories` ADD PRIMARY KEY (`id`),
ADD UNIQUE KEY `slug` (`slug`);

ALTER TABLE `galleries` ADD PRIMARY KEY (`id`),
ADD UNIQUE KEY `slug` (`slug`),
ADD KEY `user_id` (`user_id`),
ADD KEY `last_activity` (`last_activity`);

ALTER TABLE `gallery_media` ADD PRIMARY KEY (`gallery_id`, `media_id`),
ADD KEY `gallery_id` (`gallery_id`),
ADD KEY `media_id` (`media_id`);

ALTER TABLE `media` ADD PRIMARY KEY (`id`);

ALTER TABLE `menus` ADD PRIMARY KEY (`id`),
ADD UNIQUE KEY `slug` (`slug`);

ALTER TABLE `menu_items` ADD PRIMARY KEY (`id`),
ADD KEY `menu_id` (`menu_id`),
ADD KEY `parent_id` (`parent_id`),
ADD KEY `page_id` (`page_id`);

ALTER TABLE `pages` ADD PRIMARY KEY (`id`),
ADD UNIQUE KEY `unique_slug` (`slug`),
ADD KEY `parent_id` (`parent_id`);

ALTER TABLE `page_elements` ADD PRIMARY KEY (`id`);

ALTER TABLE `page_element_values` ADD PRIMARY KEY (`id`),
ADD UNIQUE KEY `unique_page_element` (`page_id`, `element_id`),
ADD KEY `fk_element_id` (`element_id`);

ALTER TABLE `phinxlog` ADD PRIMARY KEY (`version`);

ALTER TABLE `redirects` ADD PRIMARY KEY (`id`),
ADD KEY `idx_redirects_old_path` (`old_path`),
ADD KEY `is_active` (`is_active`);

ALTER TABLE `sessions` ADD PRIMARY KEY (`id`),
ADD KEY `user_id` (`user_id`),
ADD KEY `last_activity` (`last_activity`);

ALTER TABLE `tags` ADD PRIMARY KEY (`id`),
ADD UNIQUE KEY `slug` (`slug`);

ALTER TABLE `translations` ADD PRIMARY KEY (`id`),
ADD UNIQUE KEY `lang_key_unique` (`lang_code`, `translation_key`);

ALTER TABLE `users` ADD PRIMARY KEY (`id`),
ADD UNIQUE KEY `email` (`email`),
ADD UNIQUE KEY `username` (`username`);

ALTER TABLE `articles` MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `categories` MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `galleries` MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `media` MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `menus` MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `menu_items` MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `pages` MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `page_elements` MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `page_element_values` MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `redirects` MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `tags` MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `translations` MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `users` MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `articles` ADD CONSTRAINT `articles_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL;

ALTER TABLE `article_tag` ADD CONSTRAINT `article_tag_ibfk_1` FOREIGN KEY (`article_id`) REFERENCES `articles` (`id`) ON DELETE CASCADE,
ADD CONSTRAINT `article_tag_ibfk_2` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE;

ALTER TABLE `gallery_media` ADD CONSTRAINT `gallery_media_ibfk_1` FOREIGN KEY (`gallery_id`) REFERENCES `galleries` (`id`) ON DELETE CASCADE,
ADD CONSTRAINT `gallery_media_ibfk_2` FOREIGN KEY (`media_id`) REFERENCES `media` (`id`) ON DELETE CASCADE;

ALTER TABLE `menu_items` ADD CONSTRAINT `menu_items_ibfk_1` FOREIGN KEY (`menu_id`) REFERENCES `menus` (`id`) ON DELETE CASCADE,
ADD CONSTRAINT `menu_items_ibfk_2` FOREIGN KEY (`parent_id`) REFERENCES `menu_items` (`id`) ON DELETE CASCADE,
ADD CONSTRAINT `menu_items_ibfk_3` FOREIGN KEY (`page_id`) REFERENCES `pages` (`id`) ON DELETE SET NULL;

ALTER TABLE `pages` ADD CONSTRAINT `pages_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `pages` (`id`) ON DELETE SET NULL;

ALTER TABLE `page_element_values` ADD CONSTRAINT `fk_element_id` FOREIGN KEY (`element_id`) REFERENCES `page_elements` (`id`) ON DELETE CASCADE;
COMMIT;

SET FOREIGN_KEY_CHECKS = 0;

INSERT INTO `users` (
    `email`, 
    `username`, 
    `password_hash`, 
    `name`, 
    `role`, 
    `is_active`, 
    `created_at`, 
    `updated_at`
) VALUES (
    'admin@example.com', 
    'admin', 
    '$2a$12$WCoOdO3Z5G5z2sl3P/mjTuBA3ZlfaRQcmkwnlS.Enk4ZNY35HcoBa',
    'Administrator', 
    'admin', 
    1, 
    NOW(), 
    NOW()
);

INSERT INTO `categories` (`name`, `slug`, `sort_order`, `created_at`) 
VALUES ('Общи', 'general', 1, NOW());

INSERT INTO `pages` (`title`, `slug`, `content`, `template`, `view_name`, `is_active`, `created_at`) 
VALUES ('Начало', '/home', '<h1>Добре дошли!</h1><p>Системата е инсталирана успешно.</p>', 'none', 'home', 1, NOW());

INSERT INTO `menus` (`title`, `slug`, `created_at`) 
VALUES ('Main Menu', 'main-menu', NOW());

INSERT INTO `menu_items` (`menu_id`, `page_id`, `title`, `url`, `order_index`, `is_active`, `created_at`) 
VALUES (
    (SELECT id FROM `menus` WHERE slug = 'main-menu' LIMIT 1),
    (SELECT id FROM `pages` WHERE slug = 'home' LIMIT 1),
    'Начало', '/', 1, 1, NOW()
);

SET FOREIGN_KEY_CHECKS = 1;