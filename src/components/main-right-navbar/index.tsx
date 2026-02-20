"use client";

import { Link } from "@/i18n/navigation";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/main-right-navbar/language-switcher";
import MainRightSidebar from "@/components/main-right-navbar/main-right-sidebar";
import UserButton from "@/components/main-right-navbar/user-button";
import { User } from "@/lib/services/user-service";
import Image from "next/image";

type MainNavbarProps = {
    user?: User;
};

export const MainNavbar = ({ user }: MainNavbarProps) => {
    const pathname = usePathname();
    const locale = useLocale();

    const normalizedPathname = pathname.replace(`/${locale}`, "") || "/";

    const t = useTranslations("navigation");

    const isHomePage = pathname === "/";

    const mainMenuItems = [
        { title: t("home"), slug: "/" },
        { title: t("travel"), slug: "/travel" },
        { title: t("services"), slug: "/services" },
        { title: t("jobs"), slug: "/jobs" },
        { title: t("ads"), slug: "/ads" },
        { title: t("music"), slug: "https://lyricskeeper.eu" },
    ];

    const wrapperClasses = isHomePage
        ? "absolute top-0 left-0 w-full z-50"
        : "bg-website-dark";

    const containerClasses = isHomePage
        ? "container mx-auto p-2"
        : "container mx-auto py-2";

    return (
        <div className={wrapperClasses}>
            {/* Top Row */}
            <div
                className={`${containerClasses} flex justify-between items-center`}
            >
                <Link href="/">
                    <Image
                        src="/images/azmigrantat-website-logo.webp"
                        alt="Аз мигрантът"
                        width={60}
                        height={60}
                        priority
                        className="object-contain"
                    />
                </Link>

                <ul className="flex items-center gap-2">
                    <li>
                        <UserButton user={user!} />
                    </li>
                    <li>
                        <MainRightSidebar />
                    </li>
                    <li>
                        <LanguageSwitcher />
                    </li>
                </ul>
            </div>

            {/* Menu Row */}
            <div className="container mx-auto overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 max-lg:px-5 pb-2">
                <ul className="flex gap-2 whitespace-nowrap">
                    {mainMenuItems.map((item) => {
                        const isExternal = item.slug.startsWith("http");

                        const isActive =
                            !isExternal && normalizedPathname === item.slug;

                        const baseClasses =
                            "notranslate text-website-light block px-5 py-2 text-lg transition-colors rounded-4xl hover:bg-website-menu-item";

                        const activeClasses = isActive
                            ? "bg-website-menu-item"
                            : "text-website-light hover:bg-website-dark";

                        return (
                            <li key={item.slug}>
                                {isExternal ? (
                                    <a
                                        href={item.slug}
                                        title={item.title}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`${baseClasses} text-website-light hover:bg-website-dark`}
                                    >
                                        {item.title}
                                    </a>
                                ) : (
                                    <Link
                                        href={item.slug}
                                        className={`${baseClasses} ${activeClasses}`}
                                    >
                                        {item.title}
                                    </Link>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
};
