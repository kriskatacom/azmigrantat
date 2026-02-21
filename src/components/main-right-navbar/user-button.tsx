"use client";

import { BiUserCircle } from "react-icons/bi";
import { iconLargeSize } from "@/lib/constants";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import type { User } from "@/lib/services/user-service";
import { ProfileMenuItems } from "@/components/main-right-navbar/profile-menu-items";
import { GuestMenuItems } from "@/components/main-right-navbar/guest-menu-items";

type UserButtonProps = {
    user: User | null;
};

export default function UserButton({ user }: UserButtonProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label="Потребителско меню"
                    className="p-3 rounded-md hover:bg-primary duration-300"
                >
                    <BiUserCircle
                        size={iconLargeSize}
                        className="text-light font-normal"
                    />
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-48">
                {user ? <ProfileMenuItems user={user} /> : <GuestMenuItems />}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
