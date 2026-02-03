CREATE TABLE airports (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,

    iata_code CHAR(3) NULL,
    icao_code CHAR(4) NULL,

    description LONGTEXT NULL,

    image_url VARCHAR(512) NULL,

    latitude DECIMAL(10, 7) NULL,
    longitude DECIMAL(10, 7) NULL,

    website_url VARCHAR(512) NULL,
    google_map TEXT NULL,

    country_id INT UNSIGNED NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_airports_country
        FOREIGN KEY (country_id)
        REFERENCES countries(id)
        ON DELETE CASCADE,

    UNIQUE KEY uniq_iata_code (iata_code),
    UNIQUE KEY uniq_icao_code (icao_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
