"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { IoIosSearch } from "react-icons/io";
import { CiGlobe } from "react-icons/ci";
import { iconLargeSize, mainMenuItems } from "@/lib/constants";

export const MainNavbar = () => {
    const pathname = usePathname();

    if (pathname === "/")
        return (
            <div className="absolute top-0 left-0 w-full z-40">
                <nav className="container mx-auto flex justify-between items-center py-5">
                    <a href="/">
                        <img
                            src="/images/azmigrantat-website-logo.webp"
                            alt="Аз мигрантът"
                            className="object-cover w-20"
                        />
                    </a>
                    <ul className="flex items-center gap-2">
                        <li>
                            <button className="p-3 rounded-md hover:bg-primary cursor-pointer duration-300">
                                <CiGlobe
                                    size={iconLargeSize}
                                    className="text-light"
                                />
                            </button>
                        </li>
                        <li>
                            <button className="p-3 rounded-md hover:bg-primary cursor-pointer duration-300">
                                <IoIosSearch
                                    size={iconLargeSize}
                                    className="text-light"
                                />
                            </button>
                        </li>
                    </ul>
                </nav>
                <nav className="container mx-auto overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 max-lg:px-5 pb-5">
                    <ul className="flex gap-4 whitespace-nowrap">
                        {mainMenuItems.map((item) => (
                            <li
                                key={item.slug}
                                className="rounded-4xl text-secondary hover:text-light hover:bg-primary"
                            >
                                <a
                                    className="block py-3 px-5 text-lg"
                                    href={item.slug}
                                    title={item.title}
                                >
                                    {item.title}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
        );

    return (
        <div className="bg-website-dark">
            <div className="container mx-auto flex justify-between items-center py-5">
                <a href="/">
                    <img
                        src="/images/azmigrantat-website-logo.webp"
                        alt="Аз мигрантът"
                        className="object-cover w-20"
                    />
                </a>
                <ul className="flex items-center gap-2">
                    <li>
                        <button className="p-3 rounded-md hover:bg-primary cursor-pointer duration-300">
                            <CiGlobe
                                size={iconLargeSize}
                                className="text-light"
                            />
                        </button>
                    </li>
                    <li>
                        <button className="p-3 rounded-md hover:bg-primary cursor-pointer duration-300">
                            <IoIosSearch
                                size={iconLargeSize}
                                className="text-light"
                            />
                        </button>
                    </li>
                </ul>
            </div>
            <div className="container mx-auto">
                <ul className="flex items-center gap-2 whitespace-nowrap overflow-x-auto pb-5">
                    {mainMenuItems.map((item) => {
                        const isActive = pathname === item.slug;

                        return (
                            <li
                                key={item.slug}
                                className={`rounded-4xl transition-colors text-website-light ${
                                    isActive &&
                                    "bg-website-dark hover:bg-website-menu-item"
                                }`}
                            >
                                <Link
                                    className="block py-3 px-5 text-lg"
                                    href={item.slug}
                                    title={item.title}
                                >
                                    {item.title}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
};
