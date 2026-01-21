import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

export function getDb() {
    if (!pool) {
        pool = mysql.createPool({
            host: "localhost",
            user: process.env.DB_USER!,
            password: process.env.DB_PASSWORD!,
            database: process.env.DB_NAME!,
            port: 3306,
            waitForConnections: true,
            connectionLimit: 10,
        });
    }
    return pool;
}
