CREATE TABLE
`azmigrantat`.`countries` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(128) NOT NULL,
    `slug` VARCHAR(128) NULL,
    `heading` VARCHAR(128) NULL,
    `excerpt` TEXT NOT NULL,
    `image_url` VARCHAR(512) NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP on update CURRENT_TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE `SLUG` (`slug`)
) ENGINE = InnoDB;

CREATE TABLE
`azmigrantat`.`cities` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(128) NOT NULL,
    `slug` VARCHAR(128) NULL,
    `heading` VARCHAR(128) NULL,
    `excerpt` TEXT NOT NULL,
    `image_url` VARCHAR(512) NULL,
    `country_id` INT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP on update CURRENT_TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE `SLUG` (`slug`)
) ENGINE = InnoDB;

ALTER TABLE `azmigrantat`.`countries` ADD INDEX `NAME` (`name`);

CREATE TABLE
`azmigrantat`.`country_elements` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(128) NULL,
    `slug` VARCHAR(128) NULL,
    `content` TEXT NULL,
    `image_url` VARCHAR(512) NULL,
    `country_id` INT NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP on update CURRENT_TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB;

CREATE TABLE
`azmigrantat`.`embassies` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(128) NULL,
    `slug` VARCHAR(128) NULL,
    `heading` VARCHAR(128) NULL,
    `excerpt` TEXT NULL,
    `image_url` VARCHAR(512) NULL,
    `additional_images` JSON NULL,
    `content` TEXT NULL,
    `contacts_content` TEXT NULL,
    `google_map` TEXT NULL,
    `country_id` INT NULL,
    `city_id` INT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP on update CURRENT_TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB;

CREATE TABLE
`azmigrantat`.`landmarks` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(128) NULL,
    `slug` VARCHAR(128) NULL,
    `heading` VARCHAR(128) NULL,
    `excerpt` TEXT NULL,
    `image_url` VARCHAR(512) NULL,
    `additional_images` JSON NULL,
    `content` TEXT NULL,
    `contacts_content` TEXT NULL,
    `google_map` TEXT NULL,
    `country_id` INT NULL,
    `city_id` INT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP on update CURRENT_TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB;

CREATE TABLE
`azmigrantat`.`categories` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(128) NULL,
    `slug` VARCHAR(128) NULL,
    `heading` VARCHAR(128) NULL,
    `excerpt` TEXT NULL,
    `image_url` VARCHAR(512) NULL,
    `content` TEXT NULL,
    `parent_id` INT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP on update CURRENT_TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB;

ALTER TABLE `country_elements`
ADD CONSTRAINT `fk_country_elements_country`
FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`)
ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `embassies`
ADD CONSTRAINT `fk_embassies_country`
FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`)
ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `landmarks`
ADD CONSTRAINT `fk_landmarks_country`
FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`)
ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `cities`
ADD CONSTRAINT `fk_cities_country`
FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`)
ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE `categories`
ADD CONSTRAINT `fk_categories_category`
FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`)
ON DELETE CASCADE ON UPDATE RESTRICT;

CREATE TABLE `azmigrantat`.`banners` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NULL,
    `link` VARCHAR(255) NULL,
    `description` VARCHAR(255) NULL,
    `height` INT(11) NOT NULL DEFAULT '520',
    `image` VARCHAR(255) NULL,
    `sort_order` INT(11) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB;

DELIMITER $$

CREATE TRIGGER banners_before_insert
BEFORE INSERT ON banners
FOR EACH ROW
BEGIN
    IF NEW.sort_order IS NULL OR NEW.sort_order <= 0 THEN
        SET NEW.sort_order = (
            SELECT COALESCE(MAX(sort_order), 0) + 1
            FROM banners
        );
    END IF;
END $$

DELIMITER ;

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

ALTER TABLE `banners` ADD `group_key` VARCHAR(20) NULL AFTER `button_text`,
ADD `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `group_key`;

ALTER TABLE `companies` ADD COLUMN `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER `bottom_image_url`;

ALTER TABLE `companies` ADD CONSTRAINT `fk_companies_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `ads` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `heading` VARCHAR(255) NULL,
    `content` TEXT NULL,
    `image` VARCHAR(255) NULL,
    `company_id` INT(11) NULL,
    `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `status` ENUM('active','draft','pending','canceled') NOT NULL DEFAULT 'pending',
    `sort_order` INT NOT NULL DEFAULT 0,
    `target_url` VARCHAR(500) NULL,
    `location` VARCHAR(255) NULL,
    `device_type` ENUM('desktop','mobile','all') DEFAULT 'all',
    `is_featured` TINYINT(1) DEFAULT 0,
    `clicks` INT NOT NULL DEFAULT 0,
    `start_at` DATETIME NULL,
    `end_at` DATETIME NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    INDEX `idx_ads_company_id` (`company_id`),
    INDEX `idx_ads_user_id` (`user_id`),
    INDEX `idx_ads_sort` (`sort_order`, `created_at`),

    CONSTRAINT `fk_ads_company`
        FOREIGN KEY (`company_id`)
        REFERENCES `companies` (`id`)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT `fk_ads_user`
        FOREIGN KEY (`user_id`)
        REFERENCES `users` (`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `offers` (
    `id` INT (11) NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `heading` VARCHAR(255) NULL,
    `content` TEXT NULL,
    `image` VARCHAR(255) NULL,
    `company_id` INT (11) NULL,
    `user_id` CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `status` ENUM ('active', 'draft', 'pending') NOT NULL DEFAULT 'pending',
    `sort_order` INT NOT NULL DEFAULT 0,
    `location` VARCHAR(255) NULL,
    `is_featured` TINYINT (1) DEFAULT 0,
    `views` INT NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    INDEX `idx_offers_company_id` (`company_id`),
    INDEX `idx_offers_user_id` (`user_id`),
    CONSTRAINT `fk_offers_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_offers_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
