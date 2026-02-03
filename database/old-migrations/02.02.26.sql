CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    excerpt TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    additional_images JSON,
    your_location TEXT,
    google_map TEXT,
    company_slogan TEXT,
    contacts_content TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    country_id INTEGER,
    city_id INTEGER,
    category_id INTEGER,

    CONSTRAINT fk_companies_country
        FOREIGN KEY (country_id) REFERENCES countries(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_companies_city
        FOREIGN KEY (city_id) REFERENCES cities(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_companies_category
        FOREIGN KEY (category_id) REFERENCES categories(id)
        ON DELETE SET NULL
);
