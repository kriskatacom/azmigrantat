import { CreateAirportInput } from "@/app/[locale]/admin/airports/[id]/airport-form";
import { getDb } from "@/lib/db";
import { Airport } from "@/lib/types";
import { ResultSetHeader } from "mysql2";

type AirportCondition = {
    column: "id" | "slug" | "iata_code" | "icao_code" | "country_id";
    value: string | number;
};

type GetAirportsOptions = {
    where?: AirportCondition[];
};

export async function createAirport(
    airport: CreateAirportInput,
): Promise<Airport> {
    const { name, slug, country_id } = airport;

    const sql = `
        INSERT INTO airports (
            name,
            slug,
            country_id
        ) VALUES (?, ?, ?)
    `;

    try {
        const [result] = await getDb().execute<ResultSetHeader>(sql, [
            name,
            slug,
            country_id ?? null,
        ]);

        return (await getAirportByColumn("id", result.insertId)) as Airport;
    } catch (err) {
        console.error("Error creating airport:", err);
        throw err;
    }
}

export async function getAirports(
    options?: GetAirportsOptions,
): Promise<Airport[]> {
    let sql = `SELECT * FROM airports`;
    const params: (string | number)[] = [];

    if (options?.where?.length) {
        const conditions = options.where.map((cond) => {
            params.push(cond.value);
            return `${cond.column} = ?`;
        });

        sql += ` WHERE ` + conditions.join(" AND ");
    }

    sql += " ORDER BY sort_order";

    const [rows] = await getDb().query<any[]>(sql, params);

    return rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        iata_code: row.iata_code,
        icao_code: row.icao_code,
        description: row.description,
        image_url: row.image_url,
        coordinates: { latitude: row.latitude, longitude: row.longitude },
        website_url: row.website_url,
        country_id: row.country_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
    }));
}

export async function getAirportByColumn(
    column: "id" | "slug" | "iata_code",
    value: string | number,
): Promise<Airport | null> {
    const allowedColumns = ["id", "slug", "iata_code"] as const;
    if (!allowedColumns.includes(column)) {
        throw new Error(`Invalid column: ${column}`);
    }

    const [rows] = await getDb().execute(
        `SELECT * FROM airports WHERE ${column} = ? LIMIT 1`,
        [value],
    );

    const row = (rows as any[])[0];
    if (!row) return null;

    const airport: Airport = {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description ?? undefined,
        image_url: row.image_url ?? undefined,
        location_link: row.location_link ?? undefined,
        coordinates:
            row.latitude != null && row.longitude != null
                ? { latitude: Number(row.latitude), longitude: Number(row.longitude) }
                : null,
        website_url: row.website_url ?? undefined,
        country_id: row.country_id ?? undefined,
        created_at: row.created_at ?? undefined,
        updated_at: row.updated_at ?? undefined,
    };

    return airport;
}

export async function updateAirport(
    id: number,
    airport: Partial<Airport>,
): Promise<Airport> {
    const fields: string[] = [];
    const values: any[] = [];

    const { coordinates, ...rest } = airport;

    for (const [key, value] of Object.entries(rest)) {
        if (value === undefined) continue;

        fields.push(`${key} = ?`);
        values.push(value);
    }

    if (coordinates) {
        const latitude =
            typeof coordinates?.latitude === "number"
                ? coordinates.latitude
                : null;

        const longitude =
            typeof coordinates?.longitude === "number"
                ? coordinates.longitude
                : null;

        fields.push("latitude = ?", "longitude = ?");
        values.push(latitude, longitude);
    }

    if (!fields.length) {
        throw new Error("No fields provided for update.");
    }

    const sql = `
        UPDATE airports
        SET ${fields.join(", ")}
        WHERE id = ?
    `;

    values.push(id);

    try {
        await getDb().execute(sql, values);

        return {
            id,
            ...airport,
        } as Airport;
    } catch (err) {
        console.error("Error updating airport:", err);
        throw err;
    }
}

export async function deleteAirport(id: number): Promise<boolean> {
    try {
        const [result] = await getDb().execute(
            `DELETE FROM airports WHERE id = ?`,
            [id],
        );

        return ((result as any).affectedRows ?? 0) > 0;
    } catch (err) {
        console.error("Error deleting airport:", err);
        throw err;
    }
}

export async function deleteAirportsBulk(ids: number[]): Promise<number> {
    if (!ids.length) return 0;

    const placeholders = ids.map(() => "?").join(", ");
    const sql = `DELETE FROM airports WHERE id IN (${placeholders})`;

    try {
        const [result] = await getDb().execute(sql, ids);
        return (result as any).affectedRows ?? 0;
    } catch (err) {
        console.error("Error bulk deleting airports:", err);
        throw err;
    }
}