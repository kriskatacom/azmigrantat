import { ResultSetHeader } from "mysql2";
import { Company } from "@/lib/types";
import { getDb } from "@/lib/db";
import { CreateCompanyInput } from "@/app/[locale]/admin/companies/[id]/company-form";

/**
 * Създава нова компания
 */
export async function createCompany(
    company: CreateCompanyInput,
): Promise<Company> {
    const {
        name,
        slug,
        excerpt,
        description,
        your_location,
        google_map,
        company_slogan,
        contacts_content,
        country_id,
        city_id,
        category_id,
    } = company;

    const sql = `
        INSERT INTO companies (
            name,
            slug,
            excerpt,
            description,
            your_location,
            google_map,
            company_slogan,
            contacts_content,
            country_id,
            city_id,
            category_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        const [result] = await getDb().execute<ResultSetHeader>(sql, [
            name,
            slug,
            excerpt,
            description,
            your_location ?? null,
            google_map ?? null,
            company_slogan ?? null,
            contacts_content ?? null,
            country_id ?? null,
            city_id ?? null,
            category_id ?? null,
        ]);

        return (await getCompanyByColumn("id", result.insertId)) as Company;
    } catch (err) {
        console.error("Error creating company:", err);
        throw err;
    }
}

type CompanyCondition = {
    column: "id" | "slug" | "name" | "country_id" | "city_id" | "category_id";
    value: string | number;
};

type GetCompaniesOptions = {
    where?: CompanyCondition[];
};

export async function getCompanies(
    options?: GetCompaniesOptions,
): Promise<Company[]> {
    let sql = `SELECT * FROM companies`;
    const params: (string | number)[] = [];

    if (options?.where?.length) {
        const conditions = options.where.map((cond) => {
            params.push(cond.value);
            return `${cond.column} = ?`;
        });

        sql += ` WHERE ` + conditions.join(" AND ");
    }

    const [rows] = await getDb().query<any[]>(sql, params);

    return rows;
}

export async function getCompanyByColumn(
    column: "id" | "slug",
    value: string | number,
): Promise<Company | null> {
    const [rows] = await getDb().execute(
        `SELECT * FROM companies WHERE ${column} = ? LIMIT 1`,
        [value],
    );

    const row = (rows as any[])[0];
    if (!row) return null;

    return row;
}

export async function updateCompany(
    id: number,
    company: Partial<Company>,
): Promise<Company> {
    const fields: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(company)) {
        fields.push(`${key} = ?`);
        values.push(value);
    }

    if (fields.length === 0) {
        throw new Error("No fields provided for update.");
    }

    const sql = `
        UPDATE companies
        SET ${fields.join(", ")}
        WHERE id = ?
    `;

    values.push(id);

    try {
        await getDb().execute(sql, values);

        return {
            id,
            ...company,
        } as Company;
    } catch (err) {
        console.error("Error updating company:", err);
        throw err;
    }
}

export async function deleteCompany(id: number): Promise<boolean> {
    try {
        const [result] = await getDb().execute(
            `DELETE FROM companies WHERE id = ?`,
            [id],
        );

        return ((result as any).affectedRows ?? 0) > 0;
    } catch (err) {
        console.error("Error deleting company:", err);
        throw err;
    }
}

export async function deleteCompaniesBulk(ids: number[]): Promise<number> {
    if (ids.length === 0) return 0;

    const placeholders = ids.map(() => "?").join(", ");
    const sql = `DELETE FROM companies WHERE id IN (${placeholders})`;

    try {
        const [result] = await getDb().execute(sql, ids);
        return (result as any).affectedRows ?? 0;
    } catch (err) {
        console.error("Error bulk deleting companies:", err);
        throw err;
    }
}