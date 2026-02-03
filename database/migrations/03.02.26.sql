ALTER TABLE `airports` ADD `sort_order` INT(11) NOT NULL AFTER `country_id`;

DELIMITER $$

CREATE TRIGGER airports_before_insert
BEFORE INSERT ON airports
FOR EACH ROW
BEGIN
    IF NEW.sort_order IS NULL OR NEW.sort_order <= 0 THEN
        SET NEW.sort_order = (
            SELECT COALESCE(MAX(sort_order), 0) + 1
            FROM airports
        );
    END IF;
END$$

DELIMITER ;

ALTER TABLE `cities` ADD `sort_order` INT(11) NOT NULL AFTER `country_id`;

DELIMITER $$

CREATE TRIGGER cities_before_insert
BEFORE INSERT ON cities
FOR EACH ROW
BEGIN
    IF NEW.sort_order IS NULL OR NEW.sort_order <= 0 THEN
        SET NEW.sort_order = (
            SELECT COALESCE(MAX(sort_order), 0) + 1
            FROM cities
        );
    END IF;
END$$

DELIMITER ;

ALTER TABLE `companies` ADD `sort_order` INT(11) NOT NULL AFTER `country_id`;

DELIMITER $$

CREATE TRIGGER companies_before_insert
BEFORE INSERT ON companies
FOR EACH ROW
BEGIN
    IF NEW.sort_order IS NULL OR NEW.sort_order <= 0 THEN
        SET NEW.sort_order = (
            SELECT COALESCE(MAX(sort_order), 0) + 1
            FROM companies
        );
    END IF;
END$$

DELIMITER ;

ALTER TABLE `countries` ADD `sort_order` INT(11) NOT NULL AFTER `image_url`;

DELIMITER $$

CREATE TRIGGER countries_before_insert
BEFORE INSERT ON countries
FOR EACH ROW
BEGIN
    IF NEW.sort_order IS NULL OR NEW.sort_order <= 0 THEN
        SET NEW.sort_order = (
            SELECT COALESCE(MAX(sort_order), 0) + 1
            FROM countries
        );
    END IF;
END$$

DELIMITER ;

ALTER TABLE `country_elements` ADD `sort_order` INT(11) NOT NULL AFTER `country_id`;

DELIMITER $$

CREATE TRIGGER country_elements_before_insert
BEFORE INSERT ON country_elements
FOR EACH ROW
BEGIN
    IF NEW.sort_order IS NULL OR NEW.sort_order <= 0 THEN
        SET NEW.sort_order = (
            SELECT COALESCE(MAX(sort_order), 0) + 1
            FROM country_elements
        );
    END IF;
END$$

DELIMITER ;

ALTER TABLE `embassies` ADD `sort_order` INT(11) NOT NULL AFTER `city_id`;

DELIMITER $$

CREATE TRIGGER embassies_before_insert
BEFORE INSERT ON embassies
FOR EACH ROW
BEGIN
    IF NEW.sort_order IS NULL OR NEW.sort_order <= 0 THEN
        SET NEW.sort_order = (
            SELECT COALESCE(MAX(sort_order), 0) + 1
            FROM embassies
        );
    END IF;
END$$

DELIMITER ;

ALTER TABLE `landmarks` ADD `sort_order` INT(11) NOT NULL AFTER `city_id`;

DELIMITER $$

CREATE TRIGGER landmarks_before_insert
BEFORE INSERT ON landmarks
FOR EACH ROW
BEGIN
    IF NEW.sort_order IS NULL OR NEW.sort_order <= 0 THEN
        SET NEW.sort_order = (
            SELECT COALESCE(MAX(sort_order), 0) + 1
            FROM landmarks
        );
    END IF;
END$$

DELIMITER ;

ALTER TABLE `categories` ADD `sort_order` INT(11) NOT NULL AFTER `parent_id`;

DELIMITER $$

CREATE TRIGGER categories_before_insert
BEFORE INSERT ON categories
FOR EACH ROW
BEGIN
    IF NEW.sort_order IS NULL OR NEW.sort_order <= 0 THEN
        SET NEW.sort_order = (
            SELECT COALESCE(MAX(sort_order), 0) + 1
            FROM categories
        );
    END IF;
END$$

DELIMITER ;
