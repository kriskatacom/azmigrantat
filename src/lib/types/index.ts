import { IconType } from "react-icons";

export type Country = {
    id?: number;
    name?: string;
    slug?: string;
    heading?: string;
    excerpt?: string;
    image_url?: string;
};

export type CountryElement = {
    id?: number;
    name?: string;
    slug?: string;
    content?: string;
    image_url?: string;
    country_id?: number;
};

export type AdminSidebarItem = {
    name: string;
    icon: IconType;
    link?: string;
};
