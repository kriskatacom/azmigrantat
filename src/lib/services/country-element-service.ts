import { Country, CountryElement } from "@/lib/types";
import { getDb } from "@/lib/db";
import { ResultSetHeader } from "mysql2";

/**
 * Създава нов елемент за държава
 * @param {Object} countryElement - { name, slug, content, country_id, image_url }
 */
export async function createCountryElement(
    countryElement: CountryElement,
): Promise<CountryElement> {
    const { name, slug, country_id, image_url, content } = countryElement;

    const sql = `
    INSERT INTO country_elements (name, slug, content, image_url, country_id)
    VALUES (?, ?, ?, ?, ?)
  `;

    try {
        const [result] = await getDb().execute<ResultSetHeader>(sql, [
            name,
            slug,
            content ?? "",
            image_url ?? "",
            country_id,
        ]);

        const elements = await getCountryElementsByColumn("id", result.insertId.toString());
        return elements[0];
    } catch (err) {
        console.error("Error creating country:", err);
        throw err;
    }
}

export async function getCountryElementsByColumn(
    column: "id" | "slug" | "country_id",
    value: string,
) {
    const [rows] = await getDb().execute(
        `SELECT * FROM country_elements WHERE ${column} = ?`,
        [value],
    );

    return (rows as CountryElement[]) ?? null;
}
