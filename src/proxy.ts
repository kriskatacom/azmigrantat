import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { UserService } from "@/lib/services/user-service";

const intlMiddleware = createMiddleware(routing);

const userService = new UserService();

export default async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const isAdminPath = pathname.startsWith("/admin");

    if (isAdminPath) {
        const user = await userService.getCurrentUser();

        if (!user) {
            const loginUrl = new URL("/users/login", request.url);

            const originalUrl =
                request.nextUrl.pathname + request.nextUrl.search;
            loginUrl.searchParams.set("redirect", originalUrl);

            return NextResponse.redirect(loginUrl);
        }

        if (user.role !== "admin") {
            const homeUrl = new URL("/", request.url);
            return NextResponse.redirect(homeUrl);
        }
    }

    return intlMiddleware(request);
}

export const config = {
    matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
