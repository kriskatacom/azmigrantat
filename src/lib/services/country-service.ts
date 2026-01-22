import { Country } from "@/lib/types";
import { getDb } from "@/lib/db";

/**
 * Създава нова държава
 * @param {Object} country - { name, slug, heading, excerpt, image_url }
 */
export async function createCountry(country: Country): Promise<Country> {
    const { name, slug, heading, excerpt, image_url } = country;

    const sql = `
    INSERT INTO countries (name, slug, heading, excerpt, image_url)
    VALUES (?, ?, ?, ?, ?)
  `;

    try {
        const [result] = await getDb().execute(sql, [
            name,
            slug,
            heading ?? "",
            excerpt ?? "",
            image_url ?? "",
        ]);

        return { id: (result as any).insertId, ...country };
    } catch (err) {
        console.error("Error creating country:", err);
        throw err;
    }
}

type GetCountriesOptions = {
    column?: "id" | "slug" | "name";
    value?: string | number;
};

export async function getCountries(
    options?: GetCountriesOptions,
): Promise<Country[]> {
    let sql = `SELECT * FROM countries`;

    const params: (string | number)[] = [];

    // Ако има подадени опции за WHERE
    if (options?.column && options.value !== undefined) {
        sql += ` WHERE ${options.column} = ?`;
        params.push(options.value);
    }

    const [rows] = await getDb().query<any[]>(sql, params);

    return rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        heading: row.heading,
        excerpt: row.excerpt,
        image_url: row.image_url,
        created_at: row.created_at,
        updated_at: row.updated_at,
    }));
}

export async function getCountryBySlug(slug: string) {
    const [rows] = await getDb().execute(
        "SELECT * FROM countries WHERE slug = ? LIMIT 1",
        [slug],
    );

    return (rows as Country[])[0] ?? null;
}
