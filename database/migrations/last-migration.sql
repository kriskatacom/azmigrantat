CREATE TABLE `azmigrantat`.`banners` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NULL,
    `link` VARCHAR(255) NULL,
    `description` VARCHAR(255) NULL,
    `height` INT(11) NOT NULL DEFAULT '520',
    `image` VARCHAR(255) NULL,
    `sort_order` INT(11) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB;

DELIMITER $$

CREATE TRIGGER banners_before_insert
BEFORE INSERT ON banners
FOR EACH ROW
BEGIN
    IF NEW.sort_order IS NULL OR NEW.sort_order <= 0 THEN
        SET NEW.sort_order = (
            SELECT COALESCE(MAX(sort_order), 0) + 1
            FROM banners
        );
    END IF;
END $$

DELIMITER ;
