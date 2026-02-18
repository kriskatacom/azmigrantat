"use client";

import { usePathname, Link } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { IoIosSearch } from "react-icons/io";
import { iconLargeSize } from "@/lib/constants";
import LanguageSwitcher from "@/components/main-right-navbar/language-switcher";
import MainRightSidebar from "@/components/main-right-navbar/main-right-sidebar";
import UserButton from "@/components/main-right-navbar/user-button";
import { User } from "@/lib/services/user-service";

type MainNavbarProps = {
    user?: User;
}

export const MainNavbar = ({ user }: MainNavbarProps) => {
    const pathname = usePathname();
    const t = useTranslations("navigation");
    const locale = useLocale();

    const mainMenuItems = [
        { title: t("home"), slug: "/" },
        { title: t("travel"), slug: `/travel` },
        { title: t("services"), slug: "/services" },
        { title: t("jobs"), slug: "/jobs" },
        { title: t("ads"), slug: "/ads" },
        { title: t("music"), slug: "https://lyricskeeper.eu" },
    ];

    // Check if we're on the homepage (locale root)
    // next-intl's usePathname returns pathname without locale prefix
    const isHomePage = pathname === "/";

    if (isHomePage)
        return (
            <div className="absolute top-0 left-0 w-full">
                <nav className="container mx-auto flex justify-between items-center p-2">
                    <Link href="/">
                        <img
                            src="/images/azmigrantat-website-logo.webp"
                            alt="Аз мигрантът"
                            className="object-cover w-15"
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
                </nav>
                <nav className="container mx-auto overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 max-lg:px-5 pb-5">
                    <ul className="flex gap-4 whitespace-nowrap">
                        {mainMenuItems.map((item) => (
                            <li
                                key={item.slug}
                                className="rounded-4xl text-website-light hover:bg-website-dark"
                            >
                                {item.slug.startsWith("http") ? (
                                    <a
                                        className="notranslate block px-5 text-lg"
                                        href={item.slug}
                                        title={item.title}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {item.title}
                                    </a>
                                ) : (
                                    <Link
                                        className="notranslate block py-3 px-5 text-lg"
                                        href={item.slug}
                                    >
                                        {item.title}
                                    </Link>
                                )}
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
        );

    return (
        <div className="bg-website-dark">
            <div className="container mx-auto flex justify-between items-center">
                <Link href="/">
                    <img
                        src="/images/azmigrantat-website-logo.webp"
                        alt="Аз мигрантът"
                        className="object-cover w-15"
                    />
                </Link>
                <ul className="flex items-center">
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
            <div className="container mx-auto">
                <ul className="flex items-center gap-2 whitespace-nowrap overflow-x-auto">
                    {mainMenuItems.map((item) => {
                        // next-intl's usePathname returns pathname without locale
                        const isActive =
                            !item.slug.startsWith("http") &&
                            pathname === item.slug;

                        return (
                            <li
                                key={item.slug}
                                className={`rounded-4xl transition-colors text-website-light ${
                                    isActive &&
                                    "bg-website-dark hover:bg-website-menu-item"
                                }`}
                            >
                                {item.slug.startsWith("http") ? (
                                    <a
                                        className="block mb-5 px-5 text-lg"
                                        href={item.slug}
                                        title={item.title}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {item.title}
                                    </a>
                                ) : (
                                    <Link
                                        className="block px-5 text-lg"
                                        href={item.slug}
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