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

type GetCountriesOptions = {
    column?: "id" | "slug" | "name";
    value?: string | number;
};

export async function getCountries(
    options?: GetCountriesOptions,
): Promise<Country[]> {
    let sql = `SELECT * FROM countries`;

    const params: (string | number)[] = [];

    // Ако има подадени опции за WHERE
    if (options?.column && options.value !== undefined) {
        sql += ` WHERE ${options.column} = ?`;
        params.push(options.value);
    }

    const [rows] = await getDb().query<any[]>(sql, params);

    return rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        heading: row.heading,
        excerpt: row.excerpt,
        image_url: row.image_url,
        created_at: row.created_at,
        updated_at: row.updated_at,
    }));
}

export async function getCountryByColumn(
    column: "id" | "slug",
    value: string | number,
): Promise<Country | null> {
    const [rows] = await getDb().execute(
        `SELECT * FROM countries WHERE ${column} = ? LIMIT 1`,
        [value],
    );

    return (rows as Country[])[0] ?? null;
}

export async function deleteCountry(id: number): Promise<boolean> {
    try {
        const [result] = await getDb().execute(
            `DELETE FROM countries WHERE id = ?`,
            [id],
        );

        // mysql2 връща result.affectedRows
        const affectedRows = (result as any).affectedRows ?? 0;
        return affectedRows > 0;
    } catch (err) {
        console.error("Error deleting embassy:", err);
        throw err;
    }
}

export async function updateCountry(
    id: number,
    country: Partial<Country>,
): Promise<Country> {
    // Генерираме SET частта динамично
    const fields: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(country)) {
        fields.push(`${key} = ?`);
        values.push(value);
    }

    if (fields.length === 0) {
        throw new Error("No fields provided for update.");
    }

    const sql = `
        UPDATE countries
        SET ${fields.join(", ")}
        WHERE id = ?
    `;

    values.push(id); // id за WHERE

    try {
        const [result] = await getDb().execute(sql, values);

        // Връщаме обновената версия
        return {
            id,
            ...country,
        } as Country;
    } catch (err) {
        console.error("Error updating country:", err);
        throw err;
    }
}

export async function deleteCountriesBulk(ids: number[]): Promise<number> {
    if (ids.length === 0) return 0;

    const placeholders = ids.map(() => "?").join(", ");

    const sql = `DELETE FROM countries WHERE id IN (${placeholders})`;

    try {
        const [result] = await getDb().execute(sql, ids);

        const affectedRows = (result as any).affectedRows ?? 0;
        return affectedRows;
    } catch (err) {
        console.error("Error bulk deleting countries:", err);
        throw err;
    }
}