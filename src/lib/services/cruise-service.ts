import { getDb } from "@/lib/db";
import { ResultSetHeader } from "mysql2";
import { Cruise } from "../types";

type CruiseCondition = {
    column: "id" | "slug" | "country_id";
    value: string | number;
};

type GetCruisesOptions = {
    where?: CruiseCondition[];
};

// ------------------ CREATE ------------------
export async function createCruise(cruise: Cruise): Promise<Cruise> {
    const { name, slug } = cruise;

    const sql = `
        INSERT INTO cruises (name, slug)
        VALUES (?, ?)
    `;

    try {
        const [result] = await getDb().execute<ResultSetHeader>(sql, [
            name,
            slug,
        ]);

        const created = await getCruiseByColumn("id", result.insertId);
        if (!created) throw new Error("Cruise not found after insert");
        return created;
    } catch (err) {
        console.error("Error creating cruise:", err);
        throw err;
    }
}

// ------------------ GET ------------------
export async function getCruises(
    options?: GetCruisesOptions,
): Promise<Cruise[]> {
    let sql = `SELECT * FROM cruises`;
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
export async function getCruiseByColumn(
    column: "id" | "slug" | "country_id",
    value: string | number,
): Promise<Cruise | null> {
    const [rows] = await getDb().execute(
        `SELECT * FROM cruises WHERE ${column} = ? LIMIT 1`,
        [value],
    );

    const row = (rows as any[])[0];
    return row ?? null;
}

// ------------------ UPDATE ------------------
export async function updateCruise(
    id: number,
    cruise: Partial<Cruise>,
): Promise<Cruise> {
    const fields: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(cruise)) {
        fields.push(`${key} = ?`);
        values.push(value);
    }

    if (!fields.length) throw new Error("No fields provided for update.");

    const sql = `
        UPDATE cruises
        SET ${fields.join(", ")}
        WHERE id = ?
    `;

    values.push(id);

    try {
        await getDb().execute(sql, values);
        return {
            id,
            ...cruise,
        } as Cruise;
    } catch (err) {
        console.error("Error updating cruise:", err);
        throw err;
    }
}

// ------------------ DELETE ------------------
export async function deleteCruise(id: number): Promise<boolean> {
    try {
        const [result] = await getDb().execute(
            `DELETE FROM cruises WHERE id = ?`,
            [id],
        );
        return ((result as any).affectedRows ?? 0) > 0;
    } catch (err) {
        console.error("Error deleting cruise:", err);
        throw err;
    }
}

// ------------------ BULK DELETE ------------------
export async function deleteCruisesBulk(ids: number[]): Promise<number> {
    if (!ids.length) return 0;

    const placeholders = ids.map(() => "?").join(", ");
    const sql = `DELETE FROM cruises WHERE id IN (${placeholders})`;

    try {
        const [result] = await getDb().execute(sql, ids);
        return (result as any).affectedRows ?? 0;
    } catch (err) {
        console.error("Error bulk deleting cruises:", err);
        throw err;
    }
}