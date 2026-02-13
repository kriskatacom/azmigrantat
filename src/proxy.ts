import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { UserService } from "@/lib/services/user-service";

const intlMiddleware = createMiddleware(routing);
const userService = new UserService();

export default async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (pathname.startsWith("/users/login")) {
        return intlMiddleware(request);
    }

    const isAdminPath = pathname.startsWith("/admin");
    const isUserPath = pathname.startsWith("/users");

    if (isAdminPath || isUserPath) {
        const user = await userService.getCurrentUser();

        if (!user) {
            const loginUrl = new URL("/users/login", request.url);
            loginUrl.searchParams.set(
                "redirect",
                pathname + request.nextUrl.search,
            );
            return NextResponse.redirect(loginUrl);
        }

        if (isAdminPath && user.role !== "admin") {
            return NextResponse.redirect(new URL("/", request.url));
        }
    }

    return intlMiddleware(request);
}

export const config = {
    matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
