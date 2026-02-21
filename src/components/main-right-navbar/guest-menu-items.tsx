"use client";

import Link from "next/link";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function GuestMenuItems() {
    return (
        <>
            <DropdownMenuItem asChild>
                <Link href="/users/login">Вход</Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
                <Link href="/users/register">Регистрация</Link>
            </DropdownMenuItem>
        </>
    );
}
