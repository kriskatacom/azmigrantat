ALTER TABLE `companies`
ADD COLUMN `user_id` CHAR(36) CHARACTER
SET
utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER `bottom_image_url`;

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
