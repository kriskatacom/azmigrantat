"use client";

import Link from "next/link";
import { useTransition } from "react";
import { FaUser } from "react-icons/fa";
import { iconLargeSize } from "@/lib/constants";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/app/[locale]/users/actions";
import type { User } from "@/lib/services/user-service";
import { Button } from "../ui/button";
import { BiUserCircle } from "react-icons/bi";

type UserButtonProps = {
    user: User | null;
};

export default function UserButton({ user }: UserButtonProps) {
    const [isPending, startTransition] = useTransition();

    const handleLogout = () => {
        startTransition(async () => {
            await logoutAction();
        });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label="Потребителско меню"
                    className="p-3 rounded-md hover:bg-primary duration-300"
                >
                    <BiUserCircle size={iconLargeSize} className="text-light font-normal" />
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-48">
                {user ? (
                    <>
                        <DropdownMenuItem asChild>
                            <Link href="/profile">Профил</Link>
                        </DropdownMenuItem>

                        {user.role === "admin" && (
                            <DropdownMenuItem asChild>
                                <Link href="/admin/dashboard">
                                    Администрация
                                </Link>
                            </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        <form action={logoutAction}>
                            <DropdownMenuItem asChild>
                                <Button
                                    type="submit"
                                    variant={"destructive"}
                                    className="w-full"
                                    size={"lg"}
                                    onClick={handleLogout}
                                    disabled={isPending}
                                >
                                    {isPending ? "Излизане..." : "Изход"}
                                </Button>
                            </DropdownMenuItem>
                        </form>
                    </>
                ) : (
                    <>
                        <DropdownMenuItem asChild>
                            <Link href="/users/login">Вход</Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild>
                            <Link href="/users/register">Регистрация</Link>
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}