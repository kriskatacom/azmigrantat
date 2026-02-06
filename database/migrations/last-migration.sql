ALTER TABLE `airports` CHANGE `latitude` `latitude` DECIMAL(9,6) NULL DEFAULT NULL;
ALTER TABLE `airports` CHANGE `longitude` `longitude` DECIMAL(9,6) NULL DEFAULT NULL;
ALTER TABLE `airports` ADD `location_link` VARCHAR(2000) NULL AFTER `website_url`;
ALTER TABLE `airports` DROP `iata_code`, DROP `icao_code`;

CREATE TABLE municipalities (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) DEFAULT NULL,
    slug VARCHAR(255) DEFAULT NULL,
    heading VARCHAR(255) DEFAULT NULL,
    excerpt TEXT DEFAULT NULL,
    image_url VARCHAR(500) DEFAULT NULL,
    city_id INTEGER,
    country_id INTEGER,
    sort_order INT UNSIGNED DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    
    INDEX idx_city_id (city_id),
    INDEX idx_country_id (country_id),
    INDEX idx_sort_order (sort_order),

    CONSTRAINT fk_city_id FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE SET NULL,
    CONSTRAINT fk_country_id FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELIMITER $$

CREATE TRIGGER municipalities_before_insert
BEFORE INSERT ON municipalities
FOR EACH ROW
BEGIN
    IF NEW.sort_order IS NULL OR NEW.sort_order <= 0 THEN
        SET NEW.sort_order = (
            SELECT COALESCE(MAX(sort_order), 0) + 1
            FROM municipalities
        );
    END IF;
END$$

DELIMITER ;