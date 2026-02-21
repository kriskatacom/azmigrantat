"use client";

import Link from "next/link";
import {
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/app/[locale]/users/actions";
import type { User } from "@/lib/services/user-service";
import { LogoutButton } from "@/components/main-right-navbar/logout-button";

type ProfileMenuItemsProps = {
    user: User;
};

export function ProfileMenuItems({ user }: ProfileMenuItemsProps) {
    return (
        <>
            <DropdownMenuItem asChild>
                <Link href="/profile">Профил</Link>
            </DropdownMenuItem>

            {user?.role === "admin" && (
                <DropdownMenuItem asChild>
                    <Link href="/admin/dashboard">Администрация</Link>
                </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild className="p-0">
                <form action={logoutAction} className="w-full">
                    <LogoutButton />
                </form>
            </DropdownMenuItem>
        </>
    );
}
