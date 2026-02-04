import { getDb } from "@/lib/db";
import { ResultSetHeader } from "mysql2";
import { Autobus } from "../types";

type AutobusCondition = {
    column: "id" | "slug" | "country_id" | "city_id";
    value: string | number;
};

type GetAutobusesOptions = {
    where?: AutobusCondition[];
};

// ------------------ CREATE ------------------
export async function createAutobus(autobus: Autobus): Promise<Autobus> {
    const { name, slug, image_url, website_url, country_id } = autobus;

    const sql = `
        INSERT INTO autobuses (name, slug, image_url, website_url, country_id)
        VALUES (?, ?, ?, ?, ?)
    `;

    try {
        const [result] = await getDb().execute<ResultSetHeader>(sql, [
            name,
            slug,
            image_url ?? null,
            website_url ?? null,
            country_id ?? null,
        ]);

        const created = await getAutobusByColumn("id", result.insertId);
        if (!created) throw new Error("Autobus not found after insert");
        return created;
    } catch (err) {
        console.error("Error creating autobus:", err);
        throw err;
    }
}

// ------------------ GET ------------------
export async function getAutobuses(
    options?: GetAutobusesOptions,
): Promise<Autobus[]> {
    let sql = `SELECT * FROM autobuses`;
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
export async function getAutobusByColumn(
    column: "id" | "slug" | "country_id",
    value: string | number,
): Promise<Autobus | null> {
    const [rows] = await getDb().execute(
        `SELECT * FROM autobuses WHERE ${column} = ? LIMIT 1`,
        [value],
    );

    const row = (rows as any[])[0];
    return row ?? null;
}

// ------------------ UPDATE ------------------
export async function updateAutobus(
    id: number,
    autobus: Partial<Autobus>,
): Promise<Autobus> {
    const fields: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(autobus)) {
        fields.push(`${key} = ?`);
        values.push(value);
    }

    if (!fields.length) throw new Error("No fields provided for update.");

    const sql = `
        UPDATE autobuses
        SET ${fields.join(", ")}
        WHERE id = ?
    `;
    values.push(id);

    try {
        await getDb().execute(sql, values);
        return {
            id,
            ...autobus,
        } as Autobus;
    } catch (err) {
        console.error("Error updating autobus:", err);
        throw err;
    }
}

// ------------------ DELETE ------------------
export async function deleteAutobus(id: number): Promise<boolean> {
    try {
        const [result] = await getDb().execute(
            `DELETE FROM autobuses WHERE id = ?`,
            [id],
        );
        return ((result as any).affectedRows ?? 0) > 0;
    } catch (err) {
        console.error("Error deleting autobus:", err);
        throw err;
    }
}

// ------------------ BULK DELETE ------------------
export async function deleteAutobusesBulk(ids: number[]): Promise<number> {
    if (!ids.length) return 0;

    const placeholders = ids.map(() => "?").join(", ");
    const sql = `DELETE FROM autobuses WHERE id IN (${placeholders})`;

    try {
        const [result] = await getDb().execute(sql, ids);
        return (result as any).affectedRows ?? 0;
    } catch (err) {
        console.error("Error bulk deleting autobuses:", err);
        throw err;
    }
}
