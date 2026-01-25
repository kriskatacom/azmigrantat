import { Landmark } from "@/lib/types";
import { getDb } from "@/lib/db";
import { LandmarkWithCountry } from "@/app/admin/landmarks/columns";

export async function createLandmark(
    landmark: Partial<Landmark>,
): Promise<Landmark> {
    const columns: string[] = [];
    const placeholders: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(landmark)) {
        if (value !== undefined) {
            columns.push(key);
            placeholders.push("?");
            values.push(value);
        }
    }

    if (columns.length === 0) {
        throw new Error("No fields provided for creating landmark");
    }

    const sql = `
        INSERT INTO landmarks (${columns.join(", ")})
        VALUES (${placeholders.join(", ")})
    `;

    try {
        const [result] = await getDb().execute(sql, values);
        return { id: (result as any).insertId, ...landmark } as Landmark;
    } catch (err) {
        console.error("Error creating landmark:", err);
        throw err;
    }
}

const ALLOWED_COLUMNS = {
    id: "l.id",
    slug: "l.slug",
    country_id: "l.country_id",
} as const;

type AllowedColumn = keyof typeof ALLOWED_COLUMNS;

export type GetLandmarksOptions = {
    column?: AllowedColumn;
    value?: string | number;
};

export async function getLandmarks(
    options?: GetLandmarksOptions,
): Promise<LandmarkWithCountry[]> {
    let sql = `
        SELECT
            l.id,
            l.name,
            l.slug,
            l.heading,
            l.excerpt,
            l.image_url,
            l.additional_images,
            l.country_id,
            l.created_at,
            l.updated_at,

            c.id   AS c_id,
            c.name AS c_name,
            c.slug AS c_slug
        FROM landmarks l
        LEFT JOIN countries c ON c.id = l.country_id
    `;

    const params: (string | number)[] = [];

    if (options?.column && options.value !== undefined) {
        sql += ` WHERE ${ALLOWED_COLUMNS[options.column]} = ?`;
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
        additional_images: row.additional_images,
        google_map: row.google_map,
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

export async function getLandmarkByColumn(
    column: string,
    value: string | number,
): Promise<Landmark | null> {
    const [rows] = await getDb().execute(
        `SELECT * FROM landmarks WHERE ${column} = ? LIMIT 1`,
        [value],
    );

    return (rows as Landmark[])[0] ?? null;
}

export async function updateLandmark(
    id: number,
    landmark: Partial<Landmark>,
): Promise<Landmark> {
    // Генерираме SET частта динамично
    const fields: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(landmark)) {
        fields.push(`${key} = ?`);
        values.push(value);
    }

    if (fields.length === 0) {
        throw new Error("No fields provided for update.");
    }

    const sql = `
        UPDATE landmarks
        SET ${fields.join(", ")}
        WHERE id = ?
    `;

    values.push(id); // id за WHERE

    try {
        const [result] = await getDb().execute(sql, values);

        // Връщаме обновената версия
        return {
            id,
            ...landmark,
        } as Landmark;
    } catch (err) {
        console.error("Error updating landmark:", err);
        throw err;
    }
}

export async function deleteLandmark(id: number): Promise<boolean> {
    try {
        const [result] = await getDb().execute(
            `DELETE FROM landmarks WHERE id = ?`,
            [id],
        );

        // mysql2 връща result.affectedRows
        const affectedRows = (result as any).affectedRows ?? 0;
        return affectedRows > 0;
    } catch (err) {
        console.error("Error deleting landmark:", err);
        throw err;
    }
}

export async function deleteLandmarksBulk(ids: number[]): Promise<number> {
    if (ids.length === 0) return 0;

    const placeholders = ids.map(() => "?").join(", ");

    const sql = `DELETE FROM landmarks WHERE id IN (${placeholders})`;

    try {
        const [result] = await getDb().execute(sql, ids);

        const affectedRows = (result as any).affectedRows ?? 0;
        return affectedRows;
    } catch (err) {
        console.error("Error bulk deleting landmarks:", err);
        throw err;
    }
}
