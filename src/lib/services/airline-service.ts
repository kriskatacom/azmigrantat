import { getDb } from "@/lib/db";
import { ResultSetHeader } from "mysql2";
import { Airline } from "../types";

type AirlineCondition = {
    column: "id" | "slug";
    value: string | number;
};

type GetAirlinesOptions = {
    where?: AirlineCondition[];
};

// ------------------ CREATE ------------------
export async function createAirline(airline: Airline): Promise<Airline> {
    const { name, slug, website_url } = airline;

    const sql = `
        INSERT INTO airlines (name, slug, website_url)
        VALUES (?, ?, ?)
    `;

    try {
        const [result] = await getDb().execute<ResultSetHeader>(sql, [
            name,
            slug,
            website_url,
        ]);

        // Връща единичния airline чрез getAirlineByColumn
        const created = await getAirlineByColumn("id", result.insertId);
        if (!created) throw new Error("Airline not found after insert");
        return created;
    } catch (err) {
        console.error("Error creating airline:", err);
        throw err;
    }
}

// ------------------ GET ------------------
export async function getAirlines(
    options?: GetAirlinesOptions,
): Promise<Airline[]> {
    let sql = `SELECT * FROM airlines`;
    const params: (string | number)[] = [];

    if (options?.where?.length) {
        const conditions = options.where.map((cond) => {
            params.push(cond.value);
            return `${cond.column} = ?`;
        });

        sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY sort_order";

    const [rows] = await getDb().query<any[]>(sql, params);

    return rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        image_url: row.image_url,
        website_url: row.website_url,
        created_at: row.created_at,
        updated_at: row.updated_at,
    }));
}

// ------------------ GET BY COLUMN ------------------
export async function getAirlineByColumn(
    column: "id" | "slug" | "country_id",
    value: string | number,
): Promise<Airline | null> {
    const [rows] = await getDb().execute(
        `SELECT * FROM airlines WHERE ${column} = ? LIMIT 1`,
        [value],
    );

    const row = (rows as any[])[0];
    return row ?? null;
}

// ------------------ UPDATE ------------------
export async function updateAirline(
    id: number,
    airline: Partial<Airline>,
): Promise<Airline> {
    const fields: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(airline)) {
        fields.push(`${key} = ?`);
        values.push(value);
    }

    if (!fields.length) throw new Error("No fields provided for update.");

    const sql = `
        UPDATE airlines
        SET ${fields.join(", ")}
        WHERE id = ?
    `;
    values.push(id);

    try {
        await getDb().execute(sql, values);
        return {
            id,
            ...airline,
        } as Airline;
    } catch (err) {
        console.error("Error updating airline:", err);
        throw err;
    }
}

// ------------------ DELETE ------------------
export async function deleteAirline(id: number): Promise<boolean> {
    try {
        const [result] = await getDb().execute(
            `DELETE FROM airlines WHERE id = ?`,
            [id],
        );
        return ((result as any).affectedRows ?? 0) > 0;
    } catch (err) {
        console.error("Error deleting airline:", err);
        throw err;
    }
}

// ------------------ BULK DELETE ------------------
export async function deleteAirlinesBulk(ids: number[]): Promise<number> {
    if (!ids.length) return 0;

    const placeholders = ids.map(() => "?").join(", ");
    const sql = `DELETE FROM airlines WHERE id IN (${placeholders})`;

    try {
        const [result] = await getDb().execute(sql, ids);
        return (result as any).affectedRows ?? 0;
    } catch (err) {
        console.error("Error bulk deleting airlines:", err);
        throw err;
    }
}