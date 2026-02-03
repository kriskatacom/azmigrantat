import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tableName, items } = body;

        console.log(body);
        console.log(items);
        console.log(tableName);

        if (!tableName || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                {
                    error: "Невалидна заявка. Required: tableName and items array",
                },
                { status: 400 },
            );
        }

        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
            return NextResponse.json(
                { error: "Невалидно име на таблицата." },
                { status: 400 },
            );
        }

        const pool = await getDb();
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            for (let i = 0; i < items.length; i++) {
                await connection.execute(
                    `UPDATE \`${tableName}\`
             SET sort_order = ?
             WHERE id = ?`,
                    [(i + 1) * 10, items[i].id],
                );
            }

            await connection.commit();
            return NextResponse.json({
                success: true,
                message: `Успешно бяха пренаредени ${items.length} записа.`,
            });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("Грешка при пренареждане:", error);
        return NextResponse.json(
            { error: "Пренареждането на записите беше провалено." },
            { status: 500 },
        );
    }
}