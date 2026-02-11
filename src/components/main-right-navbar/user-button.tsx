"use client";

import Link from "next/link";
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
import { User } from "@/lib/services/user-service";

type UserButtonProps = {
    user?: User | null;
};

export default function UserButton({ user }: UserButtonProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="p-3 rounded-md hover:bg-primary cursor-pointer duration-300">
                    <FaUser size={iconLargeSize} className="text-light" />
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-48">
                {user ? (
                    <>
                        <DropdownMenuItem
                            onClick={() => {
                                // router.push("/profile");
                            }}
                        >
                            Профил
                        </DropdownMenuItem>

                        <DropdownMenuItem
                            onClick={() => {
                                // router.push("/settings");
                            }}
                        >
                            Настройки
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                                logoutAction();
                            }}
                        >
                            Изход
                        </DropdownMenuItem>
                    </>
                ) : (
                    <>
                        <DropdownMenuItem>
                            <Link href={"/users/login"}>Вход</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <Link href={"/users/register"}>Регистрация</Link>
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}