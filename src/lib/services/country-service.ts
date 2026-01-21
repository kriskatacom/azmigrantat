import { Country } from "@/lib/types";
import { getDb } from "@/lib/db";

/**
 * Създава нова държава
 * @param {Object} country - { name, slug, heading, excerpt, image_url }
 */
export async function createCountry(country: Country): Promise<Country> {
    const { name, slug, heading, excerpt, image_url } = country;

    const sql = `
    INSERT INTO countries (name, slug, heading, excerpt, image_url)
    VALUES (?, ?, ?, ?, ?)
  `;

    try {
        const [result] = await getDb().execute(sql, [
            name,
            slug,
            heading ?? "",
            excerpt ?? "",
            image_url ?? "",
        ]);

        return { id: (result as any).insertId, ...country };
    } catch (err) {
        console.error("Error creating country:", err);
        throw err;
    }
}

export async function getCountries() {
    const [rows] = await getDb().query("SELECT * FROM countries");
    return rows as Country[];
}

export async function getCountryBySlug(slug: string) {
    const [rows] = await getDb().execute(
        "SELECT * FROM countries WHERE slug = ? LIMIT 1",
        [slug],
    );

    return (rows as Country[])[0] ?? null;
}