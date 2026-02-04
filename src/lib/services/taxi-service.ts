import { getDb } from "@/lib/db";
import { ResultSetHeader } from "mysql2";
import { Taxi } from "../types";

type TaxiCondition = {
    column: "id" | "slug" | "country_id" | "city_id";
    value: string | number;
};

type GetTaxisOptions = {
    where?: TaxiCondition[];
};

// ------------------ CREATE ------------------
export async function createTaxi(taxi: Taxi): Promise<Taxi> {
    const { name, slug } = taxi;

    const sql = `
        INSERT INTO taxis (name, slug)
        VALUES (?, ?)
    `;

    try {
        const [result] = await getDb().execute<ResultSetHeader>(sql, [
            name,
            slug,
        ]);

        const created = await getTaxiByColumn("id", result.insertId);
        if (!created) throw new Error("Taxi not found after insert");
        return created;
    } catch (err) {
        console.error("Error creating taxi:", err);
        throw err;
    }
}

// ------------------ GET ------------------
export async function getTaxis(options?: GetTaxisOptions): Promise<Taxi[]> {
    let sql = `SELECT * FROM taxis`;
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
        country_id: row.country_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
    }));
}

// ------------------ GET BY COLUMN ------------------
export async function getTaxiByColumn(
    column: "id" | "slug" | "country_id",
    value: string | number,
): Promise<Taxi | null> {
    const [rows] = await getDb().execute(
        `SELECT * FROM taxis WHERE ${column} = ? LIMIT 1`,
        [value],
    );

    const row = (rows as any[])[0];
    return row ?? null;
}

// ------------------ UPDATE ------------------
export async function updateTaxi(
    id: number,
    taxi: Partial<Taxi>,
): Promise<Taxi> {
    const fields: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(taxi)) {
        fields.push(`${key} = ?`);
        values.push(value);
    }

    if (!fields.length) throw new Error("No fields provided for update.");

    const sql = `
        UPDATE taxis
        SET ${fields.join(", ")}
        WHERE id = ?
    `;

    values.push(id);

    try {
        await getDb().execute(sql, values);
        return {
            id,
            ...taxi,
        } as Taxi;
    } catch (err) {
        console.error("Error updating taxi:", err);
        throw err;
    }
}

// ------------------ DELETE ------------------
export async function deleteTaxi(id: number): Promise<boolean> {
    try {
        const [result] = await getDb().execute(
            `DELETE FROM taxis WHERE id = ?`,
            [id],
        );
        return ((result as any).affectedRows ?? 0) > 0;
    } catch (err) {
        console.error("Error deleting taxi:", err);
        throw err;
    }
}

// ------------------ BULK DELETE ------------------
export async function deleteTaxisBulk(ids: number[]): Promise<number> {
    if (!ids.length) return 0;

    const placeholders = ids.map(() => "?").join(", ");
    const sql = `DELETE FROM taxis WHERE id IN (${placeholders})`;

    try {
        const [result] = await getDb().execute(sql, ids);
        return (result as any).affectedRows ?? 0;
    } catch (err) {
        console.error("Error bulk deleting taxis:", err);
        throw err;
    }
}
