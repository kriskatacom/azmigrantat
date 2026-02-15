ALTER TABLE `offers` ADD `show_name` TINYINT (1) NOT NULL AFTER `updated_at`,
ADD `show_description` TINYINT (1) NOT NULL AFTER `show_name`,
ADD `show_overlay` TINYINT (1) NOT NULL AFTER `show_description`,
ADD `show_button` TINYINT (1) NOT NULL AFTER `show_button`,
ADD `href` VARCHAR(255) NULL AFTER `show_overlay`;

ALTER TABLE `offers` ADD `category_id` INT(11) NULL AFTER `company_id`;
ALTER TABLE `offers` ADD `country_id` INT(11) NULL AFTER `company_id`;
ALTER TABLE `offers` ADD `city_id` INT(11) NULL AFTER `country_id`;
