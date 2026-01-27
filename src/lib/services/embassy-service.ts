import { Embassy } from "@/lib/types";
import { getDb } from "@/lib/db";
import { EmbassyWithCountry } from "@/app/admin/embassies/columns";

export async function createEmbassy(
    embassy: Partial<Embassy>,
): Promise<Embassy> {
    const columns: string[] = [];
    const placeholders: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(embassy)) {
        if (value !== undefined) {
            columns.push(key);
            placeholders.push("?");
            values.push(value);
        }
    }

    if (columns.length === 0) {
        throw new Error("No fields provided for creating embassy");
    }

    const sql = `
        INSERT INTO embassies (${columns.join(", ")})
        VALUES (${placeholders.join(", ")})
    `;

    try {
        const [result] = await getDb().execute(sql, values);
        return { id: (result as any).insertId, ...embassy } as Embassy;
    } catch (err) {
        console.error("Error creating embassy:", err);
        throw err;
    }
}

type GetEmbassiesOptions = {
    column?: "id" | "slug" | "country_id" | "name"; // позволени колони
    value?: string | number;
};

export async function getEmbassies(options?: GetEmbassiesOptions): Promise<EmbassyWithCountry[]> {
    let sql = `
        SELECT
            e.id,
            e.name,
            e.slug,
            e.heading,
            e.excerpt,
            e.image_url,
            e.google_map,
            e.your_location,
            e.description_image_url,
            e.country_id,
            e.created_at,
            e.updated_at,
            c.id   AS c_id,
            c.name AS c_name,
            c.slug AS c_slug
        FROM embassies e
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
        google_map: row.google_map,
        your_location: row.your_location,
        image_url: row.image_url,
        description_image_url: row.description_image_url,
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

export async function getEmbassyByColumn(
    column: string,
    value: string | number,
): Promise<Embassy | null> {
    const [rows] = await getDb().execute(
        `SELECT * FROM embassies WHERE ${column} = ? LIMIT 1`,
        [value],
    );

    return (rows as Embassy[])[0] ?? null;
}

export async function updateEmbassy(
    id: number,
    embassy: Partial<Embassy>,
): Promise<Embassy> {
    // Генерираме SET частта динамично
    const fields: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(embassy)) {
        fields.push(`${key} = ?`);
        values.push(value);
    }

    if (fields.length === 0) {
        throw new Error("No fields provided for update.");
    }

    const sql = `
        UPDATE embassies
        SET ${fields.join(", ")}
        WHERE id = ?
    `;

    values.push(id); // id за WHERE

    try {
        const [result] = await getDb().execute(sql, values);

        // Връщаме обновената версия
        return {
            id,
            ...embassy,
        } as Embassy;
    } catch (err) {
        console.error("Error updating embassy:", err);
        throw err;
    }
}

export async function deleteEmbassy(id: number): Promise<boolean> {
    try {
        const [result] = await getDb().execute(
            `DELETE FROM embassies WHERE id = ?`,
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

export async function deleteEmbassiesBulk(ids: number[]): Promise<number> {
    if (ids.length === 0) return 0;

    const placeholders = ids.map(() => "?").join(", ");

    const sql = `DELETE FROM embassies WHERE id IN (${placeholders})`;

    try {
        const [result] = await getDb().execute(sql, ids);

        const affectedRows = (result as any).affectedRows ?? 0;
        return affectedRows;
    } catch (err) {
        console.error("Error bulk deleting embassies:", err);
        throw err;
    }
}
