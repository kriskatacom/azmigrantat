ALTER TABLE `airports` CHANGE `latitude` `latitude` DECIMAL(9,6) NULL DEFAULT NULL;
ALTER TABLE `airports` CHANGE `longitude` `longitude` DECIMAL(9,6) NULL DEFAULT NULL;
ALTER TABLE `airports` ADD `location_link` VARCHAR(2000) NULL AFTER `website_url`;
ALTER TABLE `airports` DROP `iata_code`, DROP `icao_code`;