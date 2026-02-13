import { getDb } from "@/lib/db";
import { Offer, OfferStatus } from "@/lib/types";
import { CreateOfferFormValues } from "@/app/[locale]/users/entrepreneurs/offers/[id]/schema";

export type UpdateOfferColumn =
    | "name"
    | "description"
    | "heading"
    | "content"
    | "image"
    | "company_id"
    | "status"
    | "sort_order"
    | "target_url"
    | "location"
    | "device_type"
    | "is_featured"
    | "clicks"
    | "start_at"
    | "end_at";

export interface CreateAdData {
    name: string;
    description?: string;
    heading?: string;
    content?: string;
    image?: string;
    company_id?: number | null;
    status?: OfferStatus;
    sort_order?: number;
}

export interface UpdateOfferData {
    name?: string;
    description?: string;
    heading?: string;
    content?: string;
    image?: string | null;
    company_id?: number | null;
    status?: OfferStatus;
    sort_order?: number;
}

export type OfferFilterColumn =
    | "status"
    | "id"
    | "user_id"
    | "is_featured"
    | "device_type"
    | "start_at"
    | "end_at";

export type OfferFilterOperator = "=" | "!=" | ">" | ">=" | "<" | "<=" | "IN";

export interface OfferFilterClause {
    column: OfferFilterColumn;
    operator: OfferFilterOperator;
    value: any;
}

export class OfferService {
    db = getDb();

    async create(
        user_id: string,
        data: CreateOfferFormValues,
    ): Promise<Offer | null> {
        const [result]: any = await this.db.query(
            `INSERT INTO offers
      (name, description, heading, content, company_id, status, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                data.name,
                data.description || null,
                data.heading || null,
                data.content || null,
                data.company_id || null,
                data.status || "pending",
                user_id,
            ],
        );

        return this.getOfferByColumn("id", result.insertId);
    }

    async getOfferByColumn(
        column: "id",
        value: string | number,
    ): Promise<Offer | null> {
        const [rows] = await this.db.execute(
            `SELECT offers.*, companies.name AS company_name
         FROM offers
         LEFT JOIN companies ON offers.company_id = companies.id
         WHERE offers.${column} = ? LIMIT 1`,
            [value],
        );

        return (rows as any[])[0] ?? null;
    }

    async getAll(options?: {
        status?: OfferStatus;
        companyId?: number;
        limit?: number;
        offset?: number;
    }): Promise<(Offer & { company_name: string })[]> {
        const { status, companyId, limit, offset } = options || {};

        let query = `
      SELECT offers.*, companies.name AS company_name
      FROM offers
      LEFT JOIN companies ON offers.company_id = companies.id
      WHERE 1=1
    `;
        const params: any[] = [];

        if (status) {
            query += ` AND offers.status = ?`;
            params.push(status);
        }

        if (companyId) {
            query += ` AND offers.company_id = ?`;
            params.push(companyId);
        }

        query += ` ORDER BY offers.sort_order ASC, offers.created_at DESC`;

        if (typeof limit === "number") {
            query += ` LIMIT ?`;
            params.push(limit);
        }

        if (typeof offset === "number") {
            query += ` OFFSET ?`;
            params.push(offset);
        }

        const [rows] = await this.db.query(query, params);
        return rows as (Offer & { company_name: string })[];
    }

    async update(
        id: number,
        data: CreateOfferFormValues,
    ): Promise<Offer | null> {
        const fields = Object.keys(data);
        if (fields.length === 0) return null;

        const setClause = fields.map((field) => `${field} = ?`).join(", ");
        const values = Object.values(data);

        await this.db.query(`UPDATE offers SET ${setClause} WHERE id = ?`, [
            ...values,
            id,
        ]);

        return this.getOfferByColumn("id", id);
    }

    async updateColumn(
        offerId: number,
        column: UpdateOfferColumn,
        value: any,
    ): Promise<void> {
        const allowedColumns: UpdateOfferColumn[] = [
            "name",
            "description",
            "heading",
            "content",
            "image",
            "company_id",
            "status",
            "sort_order",
            "target_url",
            "location",
            "device_type",
            "is_featured",
            "clicks",
            "start_at",
            "end_at",
        ];

        if (!allowedColumns.includes(column)) {
            throw new Error("Invalid column");
        }

        await this.db.query(`UPDATE offers SET ${column} = ? WHERE id = ?`, [
            value,
            offerId,
        ]);
    }

    async delete(id: number): Promise<void> {
        await this.db.query(`DELETE FROM offers WHERE id = ?`, [id]);
    }

    async activate(id: number): Promise<void> {
        await this.db.query(
            `UPDATE offers SET status = 'active' WHERE id = ?`,
            [id],
        );
    }

    async deactivate(id: number): Promise<void> {
        await this.db.query(
            `UPDATE offers SET status = 'canceled' WHERE id = ?`,
            [id],
        );
    }

    async countWithFilters(filters: OfferFilterClause[] = []): Promise<number> {
        let query = `SELECT COUNT(*) as total FROM offers WHERE 1=1`;
        const params: any[] = [];

        for (const filter of filters) {
            if (filter.operator === "IN" && Array.isArray(filter.value)) {
                const placeholders = filter.value.map(() => "?").join(",");
                query += ` AND ${filter.column} IN (${placeholders})`;
                params.push(...filter.value);
            } else {
                query += ` AND ${filter.column} ${filter.operator} ?`;
                params.push(filter.value);
            }
        }

        const [rows] = await this.db.query(query, params);
        return (rows as any[])[0]?.total ?? 0;
    }

    async updateImage(offerId: number, imageUrl: string | null): Promise<void> {
        await this.updateColumn(offerId, "image", imageUrl);
    }
}