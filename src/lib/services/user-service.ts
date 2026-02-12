import { getDb } from "@/lib/db";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { saveSession, clearSession, getSession } from "@/lib/session";

export const COOKIE_NAME = "user";

export type UserRole = "user" | "moderator" | "admin";

export interface User {
    id: string;
    email: string;
    name: string;
    username?: string | null;
    role: UserRole;
}

export interface SignUpData {
    email: string;
    password: string;
    name: string;
    username?: string;
    role?: UserRole;
}

export interface SignInData {
    email: string;
    password: string;
}

export type UpdateUserColumn =
    | "email"
    | "name"
    | "username"
    | "role"
    | "is_active";

export class UserService {
    db = getDb();

    async signUp(data: SignUpData): Promise<User> {
        const { email, password, name, username, role } = data;

        const [existing] = await this.db.query(
            "SELECT id FROM users WHERE email = ?",
            [email],
        );
        if ((existing as any[]).length > 0) {
            throw new Error(
                "Имейл адресът, с който желаете да създадете профила си вече съществува!",
            );
        }

        const password_hash = await bcrypt.hash(password, 12);
        const id = uuidv4();

        await this.db.query(
            `INSERT INTO users 
        (id, email, password_hash, name, username, role)
        VALUES (?, ?, ?, ?, ?, ?)`,
            [id, email, password_hash, name, username || null, role],
        );

        const user: User = {
            id,
            email,
            name,
            username: username || null,
            role: role || "user",
        };

        await saveSession(COOKIE_NAME, user);

        return user;
    }

    async signIn(data: SignInData): Promise<User> {
        const { email, password } = data;

        const [rows] = await this.db.query(
            `SELECT * FROM users WHERE email = ? AND deleted_at IS NULL AND is_active = 1`,
            [email],
        );

        const userRow = (rows as any[])[0];
        if (!userRow)
            throw new Error("Имейл адресът или паролата са невалидни!");

        const isMatch = await bcrypt.compare(password, userRow.password_hash);
        if (!isMatch)
            throw new Error("Имейл адресът или паролата са невалидни!");

        await this.db.query(
            `UPDATE users SET last_login = NOW(3) WHERE id = ?`,
            [userRow.id],
        );

        const user: User = {
            id: userRow.id,
            email: userRow.email,
            name: userRow.name,
            username: userRow.username,
            role: userRow.role,
        };

        await saveSession(COOKIE_NAME, user);

        return user;
    }

    async signOut() {
        await clearSession(COOKIE_NAME);
    }

    async getCurrentUser(): Promise<User | undefined> {
        const session = await getSession<{ id: string }>(COOKIE_NAME);
        if (!session) return undefined;

        const user = await this.getUserBy("id", session.id);
        return user;
    }

    async getUserBy(
        column: "id" | "email" | "username",
        value: string,
    ): Promise<User | undefined> {
        const allowedColumns = ["id", "email", "username"];
        if (!allowedColumns.includes(column)) {
            throw new Error("Invalid column");
        }

        const [rows] = await this.db.query(
            `SELECT id, email, name, username, role 
       FROM users 
       WHERE ${column} = ? AND deleted_at IS NULL AND is_active = 1
       LIMIT 1`,
            [value],
        );

        const userRow = (rows as any[])[0];
        if (!userRow) return undefined;

        const user: User = {
            id: userRow.id,
            email: userRow.email,
            name: userRow.name,
            username: userRow.username,
            role: userRow.role,
        };

        return user;
    }

    async getAllUsers(options?: {
        role?: "user" | "moderator" | "admin";
        isActive?: boolean;
        includeDeleted?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<User[]> {
        const { role, isActive, includeDeleted, limit, offset } = options || {};

        let query = `SELECT id, email, name, username, role FROM users WHERE 1=1`;
        const params: any[] = [];

        if (!includeDeleted) {
            query += ` AND deleted_at IS NULL`;
        }

        if (typeof isActive === "boolean") {
            query += ` AND is_active = ?`;
            params.push(isActive ? 1 : 0);
        }

        if (role) {
            query += ` AND role = ?`;
            params.push(role);
        }

        query += ` ORDER BY created_at DESC`;

        if (typeof limit === "number") {
            query += ` LIMIT ?`;
            params.push(limit);
        }

        if (typeof offset === "number") {
            query += ` OFFSET ?`;
            params.push(offset);
        }

        const [rows] = await this.db.query(query, params);
        return (rows as any[]).map((row) => ({
            id: row.id,
            email: row.email,
            name: row.name,
            username: row.username,
            role: row.role,
        }));
    }

    async updateColumn(
        userId: string,
        column: UpdateUserColumn,
        value: string | boolean,
    ): Promise<void> {
        const query = `UPDATE users SET ${column} = ? WHERE id = ? AND deleted_at IS NULL`;
        await this.db.query(query, [value, userId]);
    }
}