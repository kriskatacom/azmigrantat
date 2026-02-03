import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const { collapsed } = await req.json();
    const res = NextResponse.json({ success: true });

    res.cookies.set({
        name: "sidebar-collapsed",
        value: collapsed ? "true" : "false",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
    });

    return res;
}
