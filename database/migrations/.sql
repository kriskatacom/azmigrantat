ALTER TABLE `companies`
ADD COLUMN `user_id` CHAR(36) CHARACTER
SET
    utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER `bottom_image_url`;

ALTER TABLE `companies` ADD CONSTRAINT `fk_companies_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE
`ads` (
    `id` INT (11) NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `heading` VARCHAR(255) NULL,
    `content` TEXT NULL,
    `image` VARCHAR(255) NULL,
    `company_id` INT (11) NULL,
    `status` ENUM ('active', 'draft', 'pending', 'canceled') NOT NULL DEFAULT 'pending',
    `sort_order` INT NOT NULL,
    `target_url` VARCHAR(500) NULL,
    `location` VARCHAR(255) NULL,
    `device_type` ENUM('desktop','mobile','all') DEFAULT 'all',
    `is_featured` TINYINT(1) DEFAULT 0,
    `clicks` INT NOT NULL DEFAULT 0,
    `start_at` DATETIME NULL,
    `end_at` DATETIME NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP on update CURRENT_TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB;

ALTER TABLE `ads`
ADD INDEX `idx_ads_company_id` (`company_id`),
ADD CONSTRAINT `fk_ads_company`
    FOREIGN KEY (`company_id`)
    REFERENCES `companies`(`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

CREATE TABLE `offers` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `heading` VARCHAR(255) NULL,
    `content` TEXT NULL,
    `image` VARCHAR(255) NULL,
    `company_id` INT(11) NULL,
    `status` ENUM('active', 'draft', 'pending') NOT NULL DEFAULT 'pending',
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
    PRIMARY KEY (`id`)
) ENGINE=InnoDB;

ALTER TABLE `offers`
ADD INDEX `idx_offers_company_id` (`company_id`),
ADD CONSTRAINT `fk_offers_company`
    FOREIGN KEY (`company_id`)
    REFERENCES `companies`(`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;