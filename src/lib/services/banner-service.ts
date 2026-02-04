import { getDb } from "@/lib/db";
import { ResultSetHeader } from "mysql2";
import { Banner } from "@/lib/types";

type BannerCondition = {
    column: "id" | "name" | "slug";
    value: string | number;
};

type GetBannersOptions = {
    where?: BannerCondition[];
};

// ------------------ CREATE ------------------
export async function createBanner(banner: Banner): Promise<Banner> {
    const { name, link, description } = banner;

    const sql = `
        INSERT INTO banners (name, link, description)
        VALUES (?, ?, ?)
    `;

    try {
        const [result] = await getDb().execute<ResultSetHeader>(sql, [
            name,
            link,
            description,
        ]);

        const created = await getBannerByColumn("id", result.insertId);
        if (!created) throw new Error("Banner not found after insert");
        return created;
    } catch (err) {
        console.error("Error creating banner:", err);
        throw err;
    }
}

// ------------------ GET ------------------
export async function getBanners(
    options?: GetBannersOptions,
): Promise<Banner[]> {
    let sql = `SELECT * FROM banners`;
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
        link: row.link,
        description: row.description,
        image: row.image,
        sort_order: row.sort_order,
        created_at: row.created_at,
        updated_at: row.updated_at,
    }));
}

// ------------------ GET BY COLUMN ------------------
export async function getBannerByColumn(
    column: "id" | "name" | "link",
    value: string | number,
): Promise<Banner | null> {
    const [rows] = await getDb().execute(
        `SELECT * FROM banners WHERE ${column} = ? LIMIT 1`,
        [value],
    );

    const row = (rows as any[])[0];
    return row ?? null;
}

// ------------------ UPDATE ------------------
export async function updateBanner(
    id: number,
    banner: Partial<Banner>,
): Promise<Banner> {
    const fields: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(banner)) {
        fields.push(`${key} = ?`);
        values.push(value);
    }

    if (!fields.length) throw new Error("No fields provided for update.");

    const sql = `
        UPDATE banners
        SET ${fields.join(", ")}
        WHERE id = ?
    `;

    values.push(id);

    try {
        await getDb().execute(sql, values);
        const updated = await getBannerByColumn("id", id);
        if (!updated) throw new Error("Banner not found after update");
        return updated;
    } catch (err) {
        console.error("Error updating banner:", err);
        throw err;
    }
}

// ------------------ DELETE ------------------
export async function deleteBanner(id: number): Promise<boolean> {
    try {
        const [result] = await getDb().execute(
            `DELETE FROM banners WHERE id = ?`,
            [id],
        );
        return ((result as any).affectedRows ?? 0) > 0;
    } catch (err) {
        console.error("Error deleting banner:", err);
        throw err;
    }
}

// ------------------ BULK DELETE ------------------
export async function deleteBannersBulk(ids: number[]): Promise<number> {
    if (!ids.length) return 0;

    const placeholders = ids.map(() => "?").join(", ");
    const sql = `DELETE FROM banners WHERE id IN (${placeholders})`;

    try {
        const [result] = await getDb().execute(sql, ids);
        return (result as any).affectedRows ?? 0;
    } catch (err) {
        console.error("Error bulk deleting banners:", err);
        throw err;
    }
}