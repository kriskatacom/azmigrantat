"use client";

import { usePathname, Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/main-right-navbar/language-switcher";
import MainRightSidebar from "@/components/main-right-navbar/main-right-sidebar";
import { User } from "@/lib/services/user-service";
import UserButton from "@/components/main-right-navbar/user-button";
import Image from "next/image";
import clsx from "clsx";
import { useEffect, useState } from "react";

type MainNavbarProps = {
    user?: User;
};

export const MainNavbar = ({ user }: MainNavbarProps) => {
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();
    const t = useTranslations("navigation");

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const isHomePage = pathname === "/";

    const mainMenuItems = [
        { title: t("home"), slug: "/" },
        { title: t("travel"), slug: "/travel" },
        { title: t("services"), slug: "/services" },
        { title: t("jobs"), slug: "/jobs" },
        { title: t("ads"), slug: "/ads" },
        { title: t("music"), slug: "https://lyricskeeper.eu", external: true },
    ];

    const isActiveRoute = (slug: string) => {
        if (slug === "/") return pathname === "/";
        return pathname.startsWith(slug);
    };

    return (
        <div
            className={clsx(
                "w-full z-50",
                isHomePage
                    ? "absolute top-0 left-0"
                    : "bg-website-dark relative",
            )}
        >
            {/* Top bar */}
            <nav className="container mx-auto flex justify-between items-center p-2">
                <Link href="/">
                    <Image
                        src="/images/azmigrantat-website-logo.webp"
                        alt="Аз мигрантът"
                        width={60}
                        height={60}
                        priority={isHomePage}
                    />
                </Link>

                <ul className="flex items-center gap-2">
                    <li>
                        <UserButton user={user ?? null} />
                    </li>
                    <li>
                        <MainRightSidebar />
                    </li>
                    <li>
                        <LanguageSwitcher />
                    </li>
                </ul>
            </nav>

            {/* Menu */}
            <nav
                className={clsx(
                    "container mx-auto overflow-x-auto whitespace-nowrap",
                    isHomePage
                        ? "scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pb-5 max-lg:px-5"
                        : "",
                )}
            >
                <ul className="flex gap-2">
                    {mainMenuItems.map((item) => {
                        const isExternal = item.external;
                        const isActive =
                            !isExternal && isActiveRoute(item.slug);

                        return (
                            <li
                                key={item.slug}
                                className={clsx(
                                    "rounded-4xl text-website-light transition-colors",
                                    isActive && "bg-website-menu-item",
                                )}
                            >
                                {isExternal ? (
                                    <a
                                        href={item.slug}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block py-3 px-5 text-lg"
                                    >
                                        {item.title}
                                    </a>
                                ) : (
                                    <Link
                                        href={item.slug}
                                        className="block py-3 px-5 text-lg hover:bg-website-dark rounded-4xl"
                                    >
                                        {item.title}
                                    </Link>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </div>
    );
};
