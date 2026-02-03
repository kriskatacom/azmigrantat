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
