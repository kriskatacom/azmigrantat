import { getDb } from "@/lib/db";
import { Category } from "@/lib/types";
import { ResultSetHeader } from "mysql2";

export async function createCategory(category: Category): Promise<Category> {
    const { parent_id, name, slug } = category;

    const sql = `
        INSERT INTO categories (parent_id, name, slug)
        VALUES (?, ?, ?)
    `;

    try {
        const [result] = await getDb().execute<ResultSetHeader>(sql, [
            parent_id ?? null,
            name,
            slug,
        ]);

        return (await getCategoryByColumn("id", result.insertId)) as Category;
    } catch (err) {
        console.error("Error creating category:", err);
        throw err;
    }
}

type CategoryWhere = {
    id?: number;
    slug?: string;
    parent_id?: number | null;
};

type GetCategoriesOptions = {
    where?: CategoryWhere;
};

export async function getCategories(
    options?: GetCategoriesOptions,
): Promise<Category[]> {
    let sql = `
        SELECT
            c.id,
            c.name,
            c.slug,
            c.image_url,
            c.parent_id,
            p.id   AS p_id,
            p.name AS p_name,
            p.slug AS p_slug,
            c.created_at,
            c.updated_at
        FROM categories c
        LEFT JOIN categories p ON p.id = c.parent_id
    `;

    const whereClauses: string[] = [];
    const params: (string | number)[] = [];

    const where = options?.where;

    if (where?.id !== undefined) {
        whereClauses.push("c.id = ?");
        params.push(where.id);
    }

    if (where?.slug !== undefined) {
        whereClauses.push("c.slug = ?");
        params.push(where.slug);
    }

    if (where?.parent_id !== undefined) {
        if (where.parent_id === null) {
            whereClauses.push("c.parent_id IS NULL");
        } else {
            whereClauses.push("c.parent_id = ?");
            params.push(where.parent_id);
        }
    }

    if (whereClauses.length > 0) {
        sql += " WHERE " + whereClauses.join(" AND ");
    }

    sql += " ORDER BY c.sort_order";

    const [rows] = await getDb().query<any[]>(sql, params);

    return rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        imageUrl: row.image_url,
        parent_id: row.parent_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        parent: row.p_id
            ? {
                  id: row.p_id,
                  name: row.p_name,
                  slug: row.p_slug,
              }
            : undefined,
    }));
}

export type CategoryNode = {
    id: number;
    name: string;
    slug: string;
    parent_id: number | null;
    imageUrl: string;
    created_at?: string;
    updated_at?: string;
    children: CategoryNode[];
};

export async function getCategoryTree(): Promise<CategoryNode[]> {
    const sql = `
        SELECT
            id,
            name,
            slug,
            parent_id,
            image_url,
            created_at,
            updated_at
        FROM categories
        ORDER BY parent_id ASC, name ASC
    `;

    const [rows] = await getDb().query<any[]>(sql);

    const map = new Map<number, CategoryNode>();

    for (const row of rows) {
        map.set(row.id, {
            id: row.id,
            name: row.name,
            slug: row.slug,
            parent_id: row.parent_id,
            imageUrl: row.image_url,
            created_at: row.created_at,
            updated_at: row.updated_at,
            children: [],
        });
    }

    const tree: CategoryNode[] = [];

    for (const node of map.values()) {
        if (node.parent_id && map.has(node.parent_id)) {
            map.get(node.parent_id)!.children.push(node);
        } else {
            tree.push(node);
        }
    }

    return tree;
}

export async function getCategoryByColumn(
    column: "id" | "slug",
    value: string | number,
): Promise<Category | null> {
    const [rows] = await getDb().execute(
        `SELECT * FROM categories WHERE ${column} = ? LIMIT 1`,
        [value],
    );

    return (rows as Category[])[0] ?? null;
}

export async function updateCategory(
    id: number,
    category: Partial<Category>,
): Promise<Category> {
    const fields: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(category)) {
        fields.push(`${key} = ?`);
        values.push(value);
    }

    if (!fields.length) {
        throw new Error("No fields provided for update.");
    }

    const sql = `
        UPDATE categories
        SET ${fields.join(", ")}
        WHERE id = ?
    `;

    values.push(id);

    try {
        await getDb().execute(sql, values);

        return {
            id,
            ...category,
        } as Category;
    } catch (err) {
        console.error("Error updating category:", err);
        throw err;
    }
}

export async function deleteCategory(id: number): Promise<boolean> {
    try {
        const [result] = await getDb().execute(
            `DELETE FROM categories WHERE id = ?`,
            [id],
        );

        return ((result as any).affectedRows ?? 0) > 0;
    } catch (err) {
        console.error("Error deleting category:", err);
        throw err;
    }
}

export async function deleteCategoriesBulk(ids: number[]): Promise<number> {
    if (!ids.length) return 0;

    const placeholders = ids.map(() => "?").join(", ");
    const sql = `DELETE FROM categories WHERE id IN (${placeholders})`;

    try {
        const [result] = await getDb().execute(sql, ids);
        return (result as any).affectedRows ?? 0;
    } catch (err) {
        console.error("Error bulk deleting categories:", err);
        throw err;
    }
}