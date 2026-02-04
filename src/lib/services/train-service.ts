import { getDb } from "@/lib/db";
import { ResultSetHeader } from "mysql2";
import { Train } from "@/lib/types";

type TrainCondition = {
    column: "id" | "slug" | "country_id" | "city_id";
    value: string | number;
};

type GetTrainsOptions = {
    where?: TrainCondition[];
};

// ------------------ CREATE ------------------
export async function createTrain(train: Train): Promise<Train> {
    const { name, slug, image_url, website_url, country_id } = train;

    const sql = `
        INSERT INTO trains (name, slug, image_url, website_url, country_id)
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

        const created = await getTrainByColumn("id", result.insertId);
        if (!created) throw new Error("Train not found after insert");
        return created;
    } catch (err) {
        console.error("Error creating train:", err);
        throw err;
    }
}

// ------------------ GET ------------------
export async function getTrains(options?: GetTrainsOptions): Promise<Train[]> {
    let sql = `SELECT * FROM trains`;
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
export async function getTrainByColumn(
    column: "id" | "slug" | "country_id",
    value: string | number,
): Promise<Train | null> {
    const [rows] = await getDb().execute(
        `SELECT * FROM trains WHERE ${column} = ? LIMIT 1`,
        [value],
    );

    const row = (rows as any[])[0];
    return row ?? null;
}

// ------------------ UPDATE ------------------
export async function updateTrain(
    id: number,
    train: Partial<Train>,
): Promise<Train> {
    const fields: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(train)) {
        fields.push(`${key} = ?`);
        values.push(value);
    }

    if (!fields.length) throw new Error("No fields provided for update.");

    const sql = `
        UPDATE trains
        SET ${fields.join(", ")}
        WHERE id = ?
    `;

    values.push(id);

    try {
        await getDb().execute(sql, values);
        return {
            id,
            ...train,
        } as Train;
    } catch (err) {
        console.error("Error updating train:", err);
        throw err;
    }
}

// ------------------ DELETE ------------------
export async function deleteTrain(id: number): Promise<boolean> {
    try {
        const [result] = await getDb().execute(
            `DELETE FROM trains WHERE id = ?`,
            [id],
        );
        return ((result as any).affectedRows ?? 0) > 0;
    } catch (err) {
        console.error("Error deleting train:", err);
        throw err;
    }
}

// ------------------ BULK DELETE ------------------
export async function deleteTrainsBulk(ids: number[]): Promise<number> {
    if (!ids.length) return 0;

    const placeholders = ids.map(() => "?").join(", ");
    const sql = `DELETE FROM trains WHERE id IN (${placeholders})`;

    try {
        const [result] = await getDb().execute(sql, ids);
        return (result as any).affectedRows ?? 0;
    } catch (err) {
        console.error("Error bulk deleting trains:", err);
        throw err;
    }
}
