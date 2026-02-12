import { getDb } from "@/lib/db";
import { Ad } from "@/lib/types";

export type AdStatus = "active" | "draft" | "pending" | "canceled";

export interface CreateAdData {
    name: string;
    description?: string;
    heading?: string;
    content?: string;
    image?: string;
    company_id?: number | null;
    status?: AdStatus;
    sort_order?: number;
}

export interface UpdateAdData {
    name?: string;
    description?: string;
    heading?: string;
    content?: string;
    image?: string | null;
    company_id?: number | null;
    status?: AdStatus;
    sort_order?: number;
}

export type UpdateAdColumn =
    | "name"
    | "description"
    | "heading"
    | "content"
    | "image"
    | "company_id"
    | "status"
    | "sort_order";

export class AdService {
    db = getDb();

    async create(data: CreateAdData): Promise<Ad | null> {
        const {
            name,
            description,
            heading,
            content,
            image,
            company_id,
            status,
        } = data;

        const [result]: any = await this.db.query(
            `INSERT INTO ads
            (name, description, heading, content, image, company_id, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                name,
                description || null,
                heading || null,
                content || null,
                image || null,
                company_id || null,
                status || "pending",
            ],
        );

        return this.getAdsByColumn("id", result.insertId);
    }

    async getAdsByColumn(
        column: "id",
        value: string | number,
    ): Promise<Ad | null> {
        const [rows] = await getDb().execute(
            `SELECT * FROM ads WHERE ${column} = ? LIMIT 1`,
            [value],
        );

        const row = (rows as any[])[0];
        return row ?? null;
    }

    async getAll(options?: {
        status?: AdStatus;
        companyId?: number;
        limit?: number;
        offset?: number;
    }): Promise<(Ad & { company_name: string })[]> {
        const { status, companyId, limit, offset } = options || {};

        let query = `
        SELECT ads.*, companies.name AS company_name
        FROM ads
        LEFT JOIN companies ON ads.company_id = companies.id
        WHERE 1=1
    `;
        const params: any[] = [];

        if (status) {
            query += ` AND ads.status = ?`;
            params.push(status);
        }

        if (companyId) {
            query += ` AND ads.company_id = ?`;
            params.push(companyId);
        }

        query += ` ORDER BY ads.sort_order ASC, ads.created_at DESC`;

        if (typeof limit === "number") {
            query += ` LIMIT ?`;
            params.push(limit);
        }

        if (typeof offset === "number") {
            query += ` OFFSET ?`;
            params.push(offset);
        }

        const [rows] = await this.db.query(query, params);
        return rows as (Ad & { company_name: string })[];
    }

    async update(id: number, data: UpdateAdData): Promise<void> {
        const fields = Object.keys(data);
        if (fields.length === 0) return;

        const setClause = fields.map((field) => `${field} = ?`).join(", ");
        const values = Object.values(data);

        await this.db.query(`UPDATE ads SET ${setClause} WHERE id = ?`, [
            ...values,
            id,
        ]);
    }

    async updateColumn(
        adId: number,
        column: UpdateAdColumn,
        value: any,
    ): Promise<void> {
        const allowedColumns: UpdateAdColumn[] = [
            "name",
            "description",
            "heading",
            "content",
            "image",
            "company_id",
            "status",
            "sort_order",
        ];

        if (!allowedColumns.includes(column)) {
            throw new Error("Invalid column");
        }

        await this.db.query(`UPDATE ads SET ${column} = ? WHERE id = ?`, [
            value,
            adId,
        ]);
    }

    async delete(id: number): Promise<void> {
        await this.db.query(`DELETE FROM ads WHERE id = ?`, [id]);
    }

    async activate(id: number): Promise<void> {
        await this.db.query(`UPDATE ads SET status = 'active' WHERE id = ?`, [
            id,
        ]);
    }

    async deactivate(id: number): Promise<void> {
        await this.db.query(`UPDATE ads SET status = 'canceled' WHERE id = ?`, [
            id,
        ]);
    }
}
