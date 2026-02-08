"use client";

import { RiMenuAddLine } from "react-icons/ri";
import Link from "next/link";
import {
    iconLargeSize,
    iconMediumSize,
    MAIN_LEFT_SIDEBAR_ITEMS,
} from "@/lib/constants";
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { websiteName } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

export default function MainRightSidebar() {
    return (
        <div>
            <Sheet>
                <SheetTrigger asChild>
                    <button className="p-3 rounded-md hover:bg-primary cursor-pointer duration-300">
                        <RiMenuAddLine
                            size={iconLargeSize}
                            className="text-light"
                        />
                    </button>
                </SheetTrigger>

                <SheetContent side="right" className="w-100 gap-0">
                    <SheetHeader className="">
                        <SheetTitle className="text-lg text-left">
                            {websiteName()}
                        </SheetTitle>
                    </SheetHeader>

                    <Separator />

                    <nav>
                        {MAIN_LEFT_SIDEBAR_ITEMS.map((item) => (
                            <div key={item.href}>
                                <SheetClose asChild>
                                    <Link
                                        href={item.href}
                                        className="flex justify-start items-center gap-5 hover:text-white hover:bg-website-dark p-4 duration-300 rounded-md"
                                    >
                                        <item.icon size={iconMediumSize} />
                                        <span className="text-lg">
                                            {item.label}
                                        </span>
                                    </Link>
                                </SheetClose>
                                <Separator />
                            </div>
                        ))}
                    </nav>
                </SheetContent>
            </Sheet>
        </div>
    );
}
