CREATE TABLE `drivers` (
    `id` INT NOT NULL AUTO_INCREMENT,

    `user_id` CHAR(36)
        CHARACTER SET utf8mb4
        COLLATE utf8mb4_unicode_ci
        NOT NULL,

    `name` VARCHAR(255) NULL,
    `slug` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `post_description` TEXT NULL,
    `temp_description` TEXT NULL,

    `profile_image_url` VARCHAR(255) NULL,
    `preview_image_url` VARCHAR(255) NULL,
    `cover_image_url` VARCHAR(255) NULL,
    `temp_background_image_url` VARCHAR(255) NULL,
    `gallery_images` JSON NULL,
    `contact_methods` JSON NULL,

    `age` INT NULL,
    `phone` VARCHAR(128) NULL,
    `email` VARCHAR(100) NULL,
    `facebook_page_id` VARCHAR(100) NULL,
    `verified` TINYINT(1) NOT NULL DEFAULT 0,
    `car_model` VARCHAR(255) NULL,

    `from_city_id` INT NULL,
    `to_city_id` INT NULL,

    `status` ENUM('active', 'inactive', 'pending') NOT NULL DEFAULT 'active',
    `driver_travel_status` ENUM('idle', 'scheduled', 'traveling') NOT NULL DEFAULT 'idle',

    `travel_starts_at` TIMESTAMP NOT NULL,

    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_drivers_slug` (`slug`),

    INDEX `idx_drivers_user_id` (`user_id`),
    INDEX `idx_drivers_from_city` (`from_city_id`),
    INDEX `idx_drivers_to_city` (`to_city_id`),

    CONSTRAINT `fk_drivers_user`
        FOREIGN KEY (`user_id`)
        REFERENCES `users` (`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT `fk_drivers_from_city`
        FOREIGN KEY (`from_city_id`)
        REFERENCES `cities` (`id`)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT `fk_drivers_to_city`
        FOREIGN KEY (`to_city_id`)
        REFERENCES `cities` (`id`)
        ON DELETE SET NULL
        ON UPDATE CASCADE
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci;