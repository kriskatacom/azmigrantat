import { getDb } from "../db";

export type DriverStatus = "active" | "inactive" | "pending";
export type DriverTravelStatus = "idle" | "scheduled" | "traveling";

export interface Driver {
    id: number;
    user_id: string;
    name: string | null;
    slug: string;
    description: string | null;
    profile_image_url: string | null;
    cover_image_url: string | null;
    images: string | null;
    age: number | null;
    phone: string | null;
    email: string | null;
    verified: number;
    car_model: string | null;
    from_city_id: number | null;
    to_city_id: number | null;
    status: DriverStatus;
    driver_travel_status: "idle" | "scheduled" | "traveling";
    travel_starts_at: Date | null;
    created_at: Date;
    updated_at: Date | null;
}

const db = getDb();

export async function createDriver(data: {
    user_id: string;
    name?: string;
    slug: string;
}) {
    const [result] = await db.execute(
        `
    INSERT INTO drivers (user_id, name, slug)
    VALUES (?, ?, ?)
    `,
        [data.user_id, data.name ?? null, data.slug],
    );

    return result;
}

type DriverColumn =
    | "id"
    | "user_id"
    | "slug"
    | "email"
    | "from_city_id"
    | "to_city_id"
    | "status"
    | "driver_travel_status";

export async function getDriverByColumn(
    column: DriverColumn,
    value: string | number,
): Promise<Driver | null> {
    const allowedColumns: DriverColumn[] = [
        "id",
        "user_id",
        "slug",
        "email",
        "from_city_id",
        "to_city_id",
        "status",
        "driver_travel_status",
    ];

    if (!allowedColumns.includes(column)) {
        throw new Error("Invalid column name");
    }

    const [rows] = await db.execute(
        `SELECT * FROM drivers WHERE ${column} = ? LIMIT 1`,
        [value],
    );

    const drivers = rows as Driver[];
    return drivers[0] ?? null;
}

export async function updateDriver(
    id: number,
    data: Partial<Omit<Driver, "id" | "created_at">>,
) {
    const fields = Object.keys(data);

    if (!fields.length) return;

    const setClause = fields.map((field) => `${field} = ?`).join(", ");
    const values = fields.map((field) => (data as any)[field]);

    await db.execute(
        `
    UPDATE drivers
    SET ${setClause}
    WHERE id = ?
    `,
        [...values, id],
    );
}

export async function deleteDriver(id: number) {
    await db.execute(`DELETE FROM drivers WHERE id = ?`, [id]);
}

export async function searchDrivers(
    fromCityId: number | null,
    toCityId: number | null,
): Promise<Driver[]> {
    let query = `SELECT * FROM drivers WHERE status = 'active'`;
    const params: any[] = [];

    if (fromCityId) {
        query += ` AND from_city_id = ?`;
        params.push(fromCityId);
    }

    if (toCityId) {
        query += ` AND to_city_id = ?`;
        params.push(toCityId);
    }

    const [rows] = await db.execute(query, params);
    return rows as Driver[];
}

export async function setDriverTravelStatus(
    id: number,
    status: DriverStatus,
    travelStartsAt: Date | null,
) {
    await db.execute(
        `
    UPDATE drivers
    SET driver_travel_status = ?, travel_starts_at = ?
    WHERE id = ?
    `,
        [status, travelStartsAt, id],
    );
}