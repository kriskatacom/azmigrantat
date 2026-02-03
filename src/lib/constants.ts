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
import { MapMarker } from "@/components/leaflet-map";
import { CardEntity } from "@/components/card-item";

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
        image: "/images/shared-travel.png",
    },
];

export const AIRPORTS_DATA: MapMarker[] = [
    // ======================
    // 🇧🇬 БЪЛГАРИЯ
    // ======================
    {
        id: "sof",
        lat: 42.695,
        lng: 23.408,
        label: "Летище София",
        description: "Основното международно летище на България.",
        image: "https://images.unsplash.com/photo-1542296332-2e4473faf563?q=80&w=500",
        websiteUrl: "https://sofia-airport.eu/",
    },
    {
        id: "var",
        lat: 43.232,
        lng: 27.825,
        label: "Летище Варна",
        description: "Вратата към северното Черноморие.",
        image: "https://images.unsplash.com/photo-1436491865332-7a61a109c05a?q=80&w=500",
        websiteUrl: "https://varna-airport.bg/",
    },
    {
        id: "boj",
        lat: 42.569,
        lng: 27.515,
        label: "Летище Бургас",
        description: "Основен хъб за летни чартърни полети.",
        image: "https://images.unsplash.com/photo-1464037862834-ee578279ce91?q=80&w=500",
        websiteUrl: "https://burgas-airport.bg/",
    },
    {
        id: "pdv",
        lat: 42.068,
        lng: 24.851,
        label: "Летище Пловдив",
        description: "Южната врата на България.",
        image: "https://images.unsplash.com/photo-1596395817117-9878276f5b7a?q=80&w=500",
        websiteUrl: "https://www.plovdivairport.com/",
    },

    // ======================
    // 🇷🇴 РУМЪНИЯ
    // ======================
    {
        id: "otp",
        lat: 44.572,
        lng: 26.084,
        label: "Летище Хенри Коанда (Букурещ)",
        description: "Най-голямото летище в Румъния.",
        image: "https://images.unsplash.com/photo-1529134515541-00109983965a?q=80&w=500",
        websiteUrl: "https://www.bucharestairports.ro/",
    },
    {
        id: "clj",
        lat: 46.785,
        lng: 23.686,
        label: "Летище Клуж-Напока",
        description: "Основното летище на Трансилвания.",
        image: "https://images.unsplash.com/photo-1591568853744-8c8197772675?q=80&w=500",
        websiteUrl: "https://www.airportcluj.ro/",
    },
    {
        id: "tsr",
        lat: 45.81,
        lng: 21.337,
        label: "Летище Тимишоара",
        description: "Ключово летище за Западна Румъния.",
        image: "https://images.unsplash.com/photo-1542296332-2e4473faf563?q=80&w=500",
        websiteUrl: "https://aerotim.ro/",
    },

    // ======================
    // 🇬🇷 ГЪРЦИЯ
    // ======================
    {
        id: "ath",
        lat: 37.936,
        lng: 23.944,
        label: "Летище Атина",
        description: "Най-големият авиационен хъб в Гърция.",
        image: "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?q=80&w=500",
        websiteUrl: "https://www.aia.gr/",
    },
    {
        id: "skg",
        lat: 40.519,
        lng: 22.97,
        label: "Летище Солун",
        description: "Основно летище за Северна Гърция.",
        image: "https://images.unsplash.com/photo-1517050186930-6743125e197d?q=80&w=500",
        websiteUrl: "https://www.skg-airport.gr/",
    },
    {
        id: "her",
        lat: 35.339,
        lng: 25.18,
        label: "Летище Ираклио (Крит)",
        description: "Най-натовареното летище на Крит.",
        image: "https://images.unsplash.com/photo-1542296332-2e4473faf563?q=80&w=500",
        websiteUrl: "https://www.heraklion-airport.info/",
    },

    // ======================
    // 🇲🇰 СЕВЕРНА МАКЕДОНИЯ
    // ======================
    {
        id: "skp",
        lat: 41.961,
        lng: 21.621,
        label: "Летище Скопие",
        description: "Основното международно летище на Северна Македония.",
        image: "https://images.unsplash.com/photo-1506012733851-46297839744c?q=80&w=500",
        websiteUrl: "https://skp.airports.com.mk/",
    },
    {
        id: "ohr",
        lat: 41.179,
        lng: 20.742,
        label: "Летище Охрид",
        description:
            "Летище, обслужващо туристическия регион около Охридското езеро.",
        image: "https://images.unsplash.com/photo-1464037862834-ee578279ce91?q=80&w=500",
        websiteUrl: "https://ohr.airports.com.mk/",
    },

    // ======================
    // 🇹🇷 ТУРЦИЯ
    // ======================
    {
        id: "ist",
        lat: 41.275,
        lng: 28.751,
        label: "Летище Истанбул",
        description: "Едно от най-големите летища в света.",
        image: "https://images.unsplash.com/photo-1594132176000-07204481b218?q=80&w=500",
        websiteUrl: "https://www.istairport.com/",
    },
    {
        id: "saw",
        lat: 40.898,
        lng: 29.309,
        label: "Летище Сабиха Гьокчен",
        description: "Второто международно летище на Истанбул.",
        image: "https://images.unsplash.com/photo-1610450846665-680789785507?q=80&w=500",
        websiteUrl: "https://www.sabihagokcen.aero/",
    },
    {
        id: "ayt",
        lat: 36.898,
        lng: 30.8,
        label: "Летище Анталия",
        description: "Основна входна точка за Турската ривиера.",
        image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=500",
        websiteUrl: "https://www.antalya-airport.aero/",
    },

    // ======================
    // 🇩🇪 ГЕРМАНИЯ
    // ======================
    {
        id: "fra",
        lat: 50.037,
        lng: 8.562,
        label: "Летище Франкфурт",
        description: "Едно от най-големите авиационни кръстовища в Европа.",
        image: "https://images.unsplash.com/photo-1506012733851-46297839744c?q=80&w=500",
        websiteUrl: "https://www.frankfurt-airport.com/",
    },
    {
        id: "muc",
        lat: 48.353,
        lng: 11.775,
        label: "Летище Мюнхен",
        description: "Водещо летище в Южна Германия.",
        image: "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?q=80&w=500",
        websiteUrl: "https://www.munich-airport.com/",
    },

    // ======================
    // 🇫🇷 ФРАНЦИЯ
    // ======================
    {
        id: "cdg",
        lat: 49.009,
        lng: 2.547,
        label: "Шарл дьо Гол (Париж)",
        description: "Най-голямото летище във Франция.",
        image: "https://images.unsplash.com/photo-1520439515633-9990ce064117?q=80&w=500",
        websiteUrl: "https://www.parisaeroport.fr/",
    },

    // ======================
    // 🇮🇹 ИТАЛИЯ
    // ======================
    {
        id: "fco",
        lat: 41.8,
        lng: 12.238,
        label: "Фиумичино (Рим)",
        description: "Главното международно летище на Италия.",
        image: "https://images.unsplash.com/photo-1556388158-158ea5ccacbd?q=80&w=500",
        websiteUrl: "https://www.adr.it/fiumicino",
    },

    // ======================
    // 🇪🇸 ИСПАНИЯ
    // ======================
    {
        id: "mad",
        lat: 40.471,
        lng: -3.562,
        label: "Барахас (Мадрид)",
        description: "Основен авиационен хъб на Испания.",
        image: "https://images.unsplash.com/photo-1520038410233-7141be7e6f97?q=80&w=500",
        websiteUrl: "https://www.aena.es/",
    },
];

export const AIR_TICKETS_PAGE_ITEMS: CardEntity[] = [
    {
        name: "Летища",
        slug: "countries",
        imageUrl: "/images/airports.png",
    },
    {
        name: "Авиокомпании",
        slug: "airlines",
        imageUrl: "/images/airlines.png",
    },
    {
        name: "Радар на полети",
        slug: "https://www.airnavradar.com/@52.52065,13.40978,z6",
        imageUrl: "/images/flightradar.png",
        linkType: "external"
    },
];
