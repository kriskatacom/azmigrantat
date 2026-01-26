import { City } from "@/lib/types";
import { getDb } from "@/lib/db";
import { CityWithCountry } from "@/app/admin/cities/columns";

export async function createCity(city: City): Promise<City> {
    const { country_id, name, slug, heading, excerpt, image_url } = city;

    const sql = `
        INSERT INTO cities (country_id, name, slug, heading, excerpt, image_url)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    try {
        const [result] = await getDb().execute(sql, [
            country_id,
            name,
            slug,
            heading ?? "",
            excerpt ?? "",
            image_url ?? "",
        ]);

        return { id: (result as any).insertId, ...city };
    } catch (err) {
        console.error("Error creating city:", err);
        throw err;
    }
}

type GetCitiesOptions = {
    column?: "id" | "slug" | "name" | "country_id";
    value?: string | number;
};

export async function getCities(options?: GetCitiesOptions): Promise<CityWithCountry[]> {
    let sql = `
        SELECT
            e.id,
            e.name,
            e.slug,
            e.heading,
            e.excerpt,
            e.image_url,
            e.country_id,
            e.created_at,
            e.updated_at,
            c.id   AS c_id,
            c.name AS c_name,
            c.slug AS c_slug
        FROM cities e
        LEFT JOIN countries c ON c.id = e.country_id
    `;

    const params: (string | number)[] = [];

    // Ако има подадени опции за WHERE
    if (options?.column && options.value !== undefined) {
        sql += ` WHERE e.${options.column} = ?`;
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
        country_id: row.country_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        country: row.c_id
            ? {
                  id: row.c_id,
                  name: row.c_name,
                  slug: row.c_slug,
              }
            : undefined,
    }));
}

export async function getCityByColumn(
    column: "id" | "slug",
    value: string | number,
): Promise<City | null> {
    const [rows] = await getDb().execute(
        `SELECT * FROM cities WHERE ${column} = ? LIMIT 1`,
        [value],
    );

    return (rows as City[])[0] ?? null;
}

export async function deleteCity(id: number): Promise<boolean> {
    try {
        const [result] = await getDb().execute(
            `DELETE FROM cities WHERE id = ?`,
            [id],
        );

        const affectedRows = (result as any).affectedRows ?? 0;
        return affectedRows > 0;
    } catch (err) {
        console.error("Error deleting city:", err);
        throw err;
    }
}

export async function updateCity(
    id: number,
    city: Partial<City>,
): Promise<City> {
    const fields: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(city)) {
        fields.push(`${key} = ?`);
        values.push(value);
    }

    if (fields.length === 0) {
        throw new Error("No fields provided for update.");
    }

    const sql = `
        UPDATE cities
        SET ${fields.join(", ")}
        WHERE id = ?
    `;

    values.push(id);

    try {
        await getDb().execute(sql, values);

        return {
            id,
            ...city,
        } as City;
    } catch (err) {
        console.error("Error updating city:", err);
        throw err;
    }
}

export async function deleteCitiesBulk(ids: number[]): Promise<number> {
    if (ids.length === 0) return 0;

    const placeholders = ids.map(() => "?").join(", ");
    const sql = `DELETE FROM cities WHERE id IN (${placeholders})`;

    try {
        const [result] = await getDb().execute(sql, ids);
        return (result as any).affectedRows ?? 0;
    } catch (err) {
        console.error("Error bulk deleting cities:", err);
        throw err;
    }
}
