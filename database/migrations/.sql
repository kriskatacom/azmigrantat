CREATE TABLE translations (
    `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(255) NOT NULL,
    `value` TEXT NOT NULL,
    `lang` CHAR(2) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_translations_key_lang
ON translations(`key`, `lang`);

CREATE INDEX idx_translations_lang
ON translations(lang);
