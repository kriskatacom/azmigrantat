ALTER TABLE `embassies` ADD `description_image_url` TEXT NULL AFTER `image_url`;
ALTER TABLE `embassies` ADD `your_location` TEXT NULL AFTER `google_map`;
ALTER TABLE `landmarks` ADD `your_location` TEXT NULL AFTER `google_map`;
