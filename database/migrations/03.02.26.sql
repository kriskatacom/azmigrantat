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