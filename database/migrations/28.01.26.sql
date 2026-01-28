ALTER TABLE `landmarks` ADD `working_time` TEXT NULL AFTER `contacts_content`,
ADD `tickets` TEXT NULL AFTER `working_time`;

ALTER TABLE `embassies` ADD `working_time` TEXT NULL AFTER `contacts_content`,
ADD `website_link` TEXT NULL AFTER `working_time`;

ALTER TABLE `embassies` CHANGE `description_image_url` `logo` TEXT CHARACTER
SET
    utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL;

ALTER TABLE `embassies`
DROP `contacts_content`;

ALTER TABLE `embassies` ADD `address` VARCHAR(512) NULL AFTER `working_time`,
ADD `phone` VARCHAR(20) NULL AFTER `address`,
ADD `email` VARCHAR(40) NULL AFTER `phone`;
