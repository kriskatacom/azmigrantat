export const mainMenuItems = [
    { title: "Аз мигрантът", slug: "/" },
    { title: "Пътуване", slug: "/travel" },
    { title: "Услуги", slug: "/services" },
    { title: "Търся/Предлагам работа", slug: "/jobs" },
    { title: "Обяви", slug: "/ads" },
    { title: "Музика", slug: "https://lyricskeeper.eu" },
];

export const iconLargeSize = 40;
export const iconMediumSize = 30;

export const COUNTRIES: Record<string, string> = {
    България: "bulgaria",
    Турция: "turkey",
    "Обединеното кралство": "united-kingdom",
    Гърция: "greece",
    Германия: "germany",
    Дания: "denmark",
    "Босна и Херцеховина": "bosna-i-hercegovina",
    Беларус: "belarus",
    Швейцария: "switzerland",
    "Северна Македония": "north-macedonia",
    Финландия: "finland",
    Полша: "poland",
    Словакия: "slovakia",
    Чехия: "czechya",
    Австрия: "austria",
    Монако: "monaco",
    Албания: "albania",
    Русия: "russia",
    Белгия: "belgium",
    Швеция: "sweden",
    Португалия: "portugal",
    Франция: "france",
    Унгария: "hungary",
    Норвегия: "norway",
    Хърватия: "croatia",
    Естония: "estonia",
    Сърбия: "serbia",
    Нидерландия: "netherlands",
    Латвия: "latvia",
    Исландия: "iceland",
    Украйна: "ukraine",
    Косово: "kosovo",
    "Черна гора": "montenegro",
    Румъния: "romania",
    Италия: "italya",
    Испания: "ispania",
    Ирландия: "ireland",
    Малта: "malta",
};

export const COUNTRY_ELEMENTS: Record<string, string> = {
    Градове: "cities",
    Посолства: "embassies",
    Пребиваване: "residence",
    Забележителности: "landmarks",
};

// ===============================
// ADMIN SIDEBAR
// ===============================

import { FiUsers } from "react-icons/fi";
import { MdOutlineDashboard } from "react-icons/md";
import { IoSettingsOutline } from "react-icons/io5";
import { BsBuildings } from "react-icons/bs";
import { CiBank } from "react-icons/ci";
import { MdOutlineCategory } from "react-icons/md";
import { TbBuildingStore } from "react-icons/tb";
import { FaBuildingColumns } from "react-icons/fa6";
import { LiaLandmarkSolid } from "react-icons/lia";
import { AdminSidebarItem } from "@/lib/types";

export const mainSidebarItems: AdminSidebarItem[] = [
    {
        name: "Табло",
        icon: MdOutlineDashboard,
        link: "dashboard",
    },
    {
        name: "Потребители",
        icon: FiUsers,
        link: "users",
    },
    {
        name: "Държави",
        icon: CiBank,
        link: "countries",
    },
    {
        name: "Градове",
        icon: BsBuildings,
        link: "cities",
    },
    {
        name: "Категории",
        icon: MdOutlineCategory,
        link: "categories",
    },
    {
        name: "Компании",
        icon: TbBuildingStore,
        link: "companies",
    },
    {
        name: "Посолства",
        icon: FaBuildingColumns,
        link: "embassies",
    },
    {
        name: "Забележителности",
        icon: LiaLandmarkSolid,
        link: "landmarks",
    },
    {
        name: "Настройки",
        icon: IoSettingsOutline,
        link: "settings",
    },
];

export const ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
];

export const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

export const TRAVEL_CATEGORIES = [
    {
        id: 1,
        name: "Самолетни билети",
        buttonText: "Информация",
        slug: "/air-tickets",
        image: "/images/air-tickets.png"
    },
    {
        id: 2,
        name: "Автобуси",
        buttonText: "Информация",
        slug: "/autobuses",
        image: "/images/avtobuses.png"
    },
    {
        id: 3,
        name: "Железопътен превоз",
        buttonText: "Информация",
        slug: "/trains",
        image: "/images/trains.png"
    },
    {
        id: 4,
        name: "Круизи",
        buttonText: "Информация",
        slug: "/cruises",
        image: "/images/cruises.png"
    },
    {
        id: 5,
        name: "Таксита",
        buttonText: "Информация",
        slug: "/taxis",
        image: "/images/taxis.png"
    },
    {
        id: 6,
        name: "Споделено пътуване",
        buttonText: "Информация",
        slug: "/shared-travel",
        image: "/images/shared-travel.png"
    },
];