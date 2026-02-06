import { ResultSetHeader } from "mysql2";
import { getDb } from "@/lib/db";
import { MunicipalityWithCityAndCountry } from "@/app/[locale]/admin/municipalities/columns";

export interface Municipality {
    id: number;
    name?: string;
    slug?: string;
    heading?: string;
    excerpt?: string;
    image_url?: string | null;
    city_id?: number | null;
    country_id?: number | null;
    created_at?: string;
    updated_at?: string;
}

export interface CreateMunicipalityInput {
    id: number | null;
    name: string;
    slug: string;
    heading?: string;
    excerpt?: string;
    image_url?: string | null;
    city_id?: number | null;
    country_id?: number | null;
}

// -------------------- CREATE --------------------
export async function createMunicipality(
    data: CreateMunicipalityInput,
): Promise<Municipality> {
    const {
        name,
        slug,
        heading,
        excerpt,
        image_url,
        city_id,
        country_id,
    } = data;

    const sql = `
        INSERT INTO municipalities (
            name, slug, heading, excerpt, image_url, city_id, country_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        const [result] = await getDb().execute<ResultSetHeader>(sql, [
            name,
            slug,
            heading ?? null,
            excerpt ?? null,
            image_url ?? null,
            city_id ?? null,
            country_id ?? null,
        ]);

        return (await getMunicipalityByColumn("id", result.insertId)) as Municipality;
    } catch (err) {
        console.error("Error creating municipality:", err);
        throw err;
    }
}

// -------------------- GET LIST --------------------
type MunicipalityCondition = {
    column: "id" | "slug" | "city_id" | "country_id";
    value: string | number;
};

type GetMunicipalitiesOptions = {
    where?: MunicipalityCondition[];
};

export async function getMunicipalities(
    options?: GetMunicipalitiesOptions,
): Promise<MunicipalityWithCityAndCountry[]> {
    let sql = `
        SELECT 
            m.*,
            c.id AS city_id, c.name AS city_name, c.slug AS city_slug,
            co.id AS country_id, co.name AS country_name, co.slug AS country_slug
        FROM municipalities m
        LEFT JOIN cities c ON m.city_id = c.id
        LEFT JOIN countries co ON m.country_id = co.id
    `;

    const params: (string | number)[] = [];

    if (options?.where?.length) {
        const conditions = options.where.map((cond) => {
            params.push(cond.value);
            return `m.${cond.column} = ?`;
        });
        sql += ` WHERE ` + conditions.join(" AND ");
    }

    sql += " ORDER BY m.sort_order";

    const [rows] = await getDb().query<any[]>(sql, params);

    return rows.map((row) => ({
        ...row,
        city: row.city_id
            ? { id: row.city_id, name: row.city_name, slug: row.city_slug }
            : undefined,
        country: row.country_id
            ? { id: row.country_id, name: row.country_name, slug: row.country_slug }
            : undefined,
    }));
}

// -------------------- GET BY COLUMN --------------------
export async function getMunicipalityByColumn(
    column: "id" | "slug" | "city_id",
    value: string | number,
): Promise<Municipality | null> {
    const allowedColumns = ["id", "slug", "city_id"] as const;
    if (!allowedColumns.includes(column)) {
        throw new Error(`Invalid column: ${column}`);
    }

    const [rows] = await getDb().execute(
        `SELECT * FROM municipalities WHERE ${column} = ? LIMIT 1`,
        [value],
    );

    const row = (rows as any[])[0];
    if (!row) return null;

    return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        heading: row.heading ?? undefined,
        excerpt: row.excerpt ?? undefined,
        image_url: row.image_url ?? undefined,
        city_id: row.city_id ?? undefined,
        country_id: row.country_id ?? undefined,
        created_at: row.created_at ?? undefined,
        updated_at: row.updated_at ?? undefined,
    };
}

// -------------------- UPDATE --------------------
export async function updateMunicipality(
    id: number,
    data: Partial<Municipality>,
): Promise<Municipality> {
    const fields: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(data)) {
        if (value === undefined) continue;
        fields.push(`${key} = ?`);
        values.push(value);
    }

    if (!fields.length) {
        throw new Error("No fields provided for update.");
    }

    const sql = `
        UPDATE municipalities
        SET ${fields.join(", ")}
        WHERE id = ?
    `;

    values.push(id);

    try {
        await getDb().execute(sql, values);
        return { id, ...data } as Municipality;
    } catch (err) {
        console.error("Error updating municipality:", err);
        throw err;
    }
}

// -------------------- DELETE --------------------
export async function deleteMunicipality(id: number): Promise<boolean> {
    try {
        const [result] = await getDb().execute(
            `DELETE FROM municipalities WHERE id = ?`,
            [id],
        );

        return ((result as any).affectedRows ?? 0) > 0;
    } catch (err) {
        console.error("Error deleting municipality:", err);
        throw err;
    }
}

// -------------------- BULK DELETE --------------------
export async function deleteMunicipalitiesBulk(ids: number[]): Promise<number> {
    if (!ids.length) return 0;

    const placeholders = ids.map(() => "?").join(", ");
    const sql = `DELETE FROM municipalities WHERE id IN (${placeholders})`;

    try {
        const [result] = await getDb().execute(sql, ids);
        return (result as any).affectedRows ?? 0;
    } catch (err) {
        console.error("Error bulk deleting municipalities:", err);
        throw err;
    }
}
