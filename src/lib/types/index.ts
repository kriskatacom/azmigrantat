import { IconType } from "react-icons";

export type Country = {
    id?: number;
    name?: string;
    slug?: string;
    heading?: string;
    excerpt?: string;
    image_url?: string | null;
    created_at?: string;
    updated_at?: string;
};

export type City = {
    id?: number;
    name?: string;
    slug?: string;
    heading?: string;
    excerpt?: string;
    image_url?: string | null;
    country_id?: number | null;
    created_at?: string;
    updated_at?: string;
};

export type CountryElement = {
    id?: number;
    name?: string;
    slug?: string;
    content?: string;
    image_url?: string;
    country_id?: number;
    created_at?: string;
    updated_at?: string;
};

export type AdminSidebarItem = {
    name: string;
    icon: IconType;
    link?: string;
};

export type Embassy = {
    id?: number;
    name?: string;
    slug?: string;
    heading?: string;
    excerpt?: string;
    content?: string;
    contacts_content?: string;
    google_map: string;
    image_url?: string | null;
    additional_images?: string | null;
    country_id: number | null;
    city_id?: number;
    created_at?: string;
    updated_at?: string;
};

export type Landmark = {
    id?: number;
    name?: string;
    slug?: string;
    heading?: string;
    excerpt?: string;
    content?: string;
    contacts_content?: string;
    google_map: string;
    image_url?: string | null;
    additional_images?: string | null;
    country_id: number | null;
    city_id?: number;
    created_at?: string;
    updated_at?: string;
};
