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

import { FiHome, FiSettings, FiUser, FiUsers } from "react-icons/fi";
import { MdOutlineDashboard } from "react-icons/md";
import { IoAirplaneSharp, IoSettingsOutline } from "react-icons/io5";
import {
    BsBuilding,
    BsBuildings,
    BsBuildingSlash,
    BsFillBuildingsFill,
} from "react-icons/bs";
import { CiBank } from "react-icons/ci";
import { MdOutlineCategory } from "react-icons/md";
import { TbBuildingStore } from "react-icons/tb";
import { FaBuildingColumns } from "react-icons/fa6";
import { LiaLandmarkSolid } from "react-icons/lia";
import { AdminSidebarItem } from "@/lib/types";
import { CardEntity } from "@/components/card-item";
import { FaBus, FaImage, FaShip, FaTaxi, FaTrain } from "react-icons/fa";
import {
    Building2,
    FileText,
    Home,
    PhoneCall,
    ShieldCheck,
} from "lucide-react";
import { RiAdvertisementLine } from "react-icons/ri";
import { MdOutlineWorkOutline } from "react-icons/md";
import { FcAdvertising } from "react-icons/fc";
import { StatItemCardProps } from "@/components/stat-item-card";

export const mainSidebarItems: AdminSidebarItem[] = [
    {
        name: "Табло",
        icon: MdOutlineDashboard,
        link: "/admin/dashboard",
    },
    {
        name: "Потребители",
        icon: FiUsers,
        link: "/admin/users",
    },
    {
        name: "Държави",
        icon: CiBank,
        link: "/admin/countries",
    },
    {
        name: "Градове",
        icon: BsBuildings,
        link: "/admin/cities",
    },
    {
        name: "Общини",
        icon: BsBuildingSlash,
        link: "/admin/municipalities",
    },
    {
        name: "Категории",
        icon: MdOutlineCategory,
        link: "/admin/categories",
    },
    {
        name: "Компании",
        icon: TbBuildingStore,
        link: "/admin/companies",
    },
    {
        name: "Посолства",
        icon: FaBuildingColumns,
        link: "/admin/embassies",
    },
    {
        name: "Забележителности",
        icon: LiaLandmarkSolid,
        link: "/admin/landmarks",
    },
    {
        name: "Летища",
        icon: IoAirplaneSharp,
        link: "/admin/airports",
    },
    {
        name: "Авиокомпании",
        icon: BsFillBuildingsFill,
        link: "/admin/airlines",
    },
    {
        name: "Автобусни гари",
        icon: FaBus,
        link: "/admin/autobuses",
    },
    {
        name: "Железопътни гари",
        icon: FaTrain,
        link: "/admin/trains",
    },
    {
        name: "Таксита",
        icon: FaTaxi,
        link: "/admin/taxis",
    },
    {
        name: "Круиз компании",
        icon: FaShip,
        link: "/admin/cruises",
    },
    {
        name: "Банери",
        icon: FaImage,
        link: "/admin/banners",
    },
    {
        name: "Настройки",
        icon: IoSettingsOutline,
        link: "/admin/settings",
    },
];

export const entrepreneurSidebarItems: AdminSidebarItem[] = [
    { name: "Табло", link: "/users/entrepreneurs/dashboard", icon: FiHome },
    { name: "Реклами", link: "/users/entrepreneurs/ads", icon: FiUser },
    { name: "Обяви", link: "/users/entrepreneurs/offers", icon: FiSettings },
    {
        name: "Компании",
        link: "/users/entrepreneurs/companies",
        icon: BsBuilding,
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
        image: "/images/air-tickets.png",
    },
    {
        id: 2,
        name: "Автобуси",
        buttonText: "Информация",
        slug: "/autobuses",
        image: "/images/avtobuses.png",
    },
    {
        id: 3,
        name: "Железопътен превоз",
        buttonText: "Информация",
        slug: "/trains",
        image: "/images/trains.png",
    },
    {
        id: 4,
        name: "Круизи",
        buttonText: "Информация",
        slug: "/cruises",
        image: "/images/cruises.png",
    },
    {
        id: 5,
        name: "Таксита",
        buttonText: "Информация",
        slug: "/taxis",
        image: "/images/taxis.png",
    },
    {
        id: 6,
        name: "Споделено пътуване",
        buttonText: "Информация",
        slug: "/shared-travel",
        image: "/images/shared-plane-travel.png",
    },
];

export const AIR_TICKETS_PAGE_ITEMS: CardEntity[] = [
    {
        name: "Летища",
        slug: "countries",
        image_url: "/images/airports.png",
    },
    {
        name: "Авиокомпании",
        slug: "airlines",
        image_url: "/images/airlines.png",
    },
    {
        name: "Радар на полети",
        slug: "https://www.airnavradar.com/@52.52065,13.40978,z6",
        image_url: "/images/flightradar.png",
        linkType: "external",
    },
];

export const AUTOBUSES_PAGE_ITEMS: CardEntity[] = [
    {
        name: "Търсене на автобусни спирки",
        slug: "https://www.flixbus.bg",
        image_url: "/images/FlixBus.png",
        linkType: "external",
    },
    {
        name: "Държави",
        slug: "countries",
        image_url: "/images/autobuses.png",
    },
];

export const TRAINS_PAGE_ITEMS: CardEntity[] = [
    {
        name: "Държави",
        slug: "countries",
        image_url: "/images/trains-transport.png",
    },
    {
        name: "Търсене на ЖП гари",
        slug: "https://www.chronotrains.com/en?city=Sofia%2CBG",
        image_url: "/images/chronotrains.png",
        linkType: "external",
    },
];

export const TAXIS_PAGE_ITEMS: CardEntity[] = [
    {
        name: "Държави",
        slug: "countries",
        image_url: "/images/taxi-companies.png",
    },
    {
        name: "Поръчка на таксита",
        slug: "https://www.taxi.eu/en",
        image_url: "/images/taxieu.png",
        linkType: "external",
    },
    {
        name: "Частни таксита",
        slug: "private-taxis",
        image_url: "/images/private-taxis.png",
    },
];

export const CRUISES_PAGE_ITEMS: CardEntity[] = [
    {
        name: "Круизни компании",
        slug: "cruise-companies",
        image_url: "/images/cruise-companies.png",
    },
    {
        name: "Търсене на пристанища",
        slug: "https://portguide.org",
        image_url: "/images/portguide.png",
        linkType: "external",
    },
];

export const HOME_TYPEWRITER_TEXTS: string[] = [
    "Кредити",
    "Пътуване",
    "Търся/пр. работа",
    "Обяви",
    "Музика",
    "Застраховки",
    "Преводи",
];

export const HOME_ELEMENTS: CardEntity[] = [
    {
        name: "Пътуване",
        slug: "travel",
        image_url: "/images/travel.png",
    },
    {
        name: "Услуги",
        slug: "services",
        image_url: "/images/services.png",
    },
    {
        name: "Търся/предлагам работа",
        slug: "looking-offering-job",
        image_url: "/images/looking-offering-job.png",
    },
    {
        name: "Обяви",
        slug: "jobs",
        image_url: "/images/jobs.png",
    },
    {
        name: "Мусика",
        slug: "music",
        image_url: "/images/music.png",
    },
];

export const MAIN_LEFT_SIDEBAR_ITEMS = [
    {
        label: "Начало",
        href: "/",
        icon: Home,
    },
    {
        label: "Условия за ползване",
        href: "/legal/terms",
        icon: FileText,
    },
    {
        label: "Политика за поверителност",
        href: "/legal/privacy",
        icon: ShieldCheck,
    },
    {
        label: "Контакти",
        href: "/#contacts",
        icon: PhoneCall,
    },
    {
        label: "За нас",
        href: "/about-us",
        icon: Building2,
    },
];

export const ENTREPRENEUR__DASHBOARD_STATS: StatItemCardProps[] = [
    {
        title: "Активни реклами",
        value: "1",
        icon: FcAdvertising,
        href: "/entrepreneurs/ads?status=active",
    },
    {
        title: "Реклами",
        value: "3",
        icon: RiAdvertisementLine,
        href: "/entrepreneurs/ads",
    },
    {
        title: "Обяви",
        value: "1",
        icon: MdOutlineWorkOutline,
        href: "/entrepreneurs/offers",
    },
    {
        title: "Компании",
        value: "1",
        icon: BsBuilding,
        href: "/entrepreneurs/companies",
    },
];
