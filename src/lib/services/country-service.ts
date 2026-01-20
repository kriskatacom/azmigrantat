import { Country } from "@/lib/types";
import pool from "@/lib/db";

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
        const [result] = await pool.execute(sql, [
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