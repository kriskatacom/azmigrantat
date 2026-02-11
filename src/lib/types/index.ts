import { IconType } from "react-icons";

export type Country = {
    id: number;
    name?: string;
    slug?: string;
    heading?: string;
    excerpt?: string;
    image_url?: string | null;
    created_at?: string;
    updated_at?: string;
};

export type City = {
    id: number;
    name?: string;
    slug?: string;
    heading?: string;
    excerpt?: string;
    image_url?: string | null;
    country_id?: number | null;
    created_at?: string;
    updated_at?: string;
};

export type Municipaliy = {
    id: number;
    name?: string;
    slug?: string;
    heading?: string;
    excerpt?: string;
    image_url?: string | null;
    city_id?: number | null;
    country_id?: number | null;
    created_at?: string;
    updated_at?: string;
};

export interface Coordinates {
    latitude: number;
    longitude: number;
}

export interface Airport {
    id: number;
    name: string;
    slug: string;
    description?: string;
    image_url?: string;
    location_link?: string;
    coordinates: Coordinates | null;
    website_url?: string;
    country_id?: number;
    created_at?: string;
    updated_at?: string;
}

export interface Airline {
    id: number;
    name: string;
    slug: string;
    image_url?: string;
    website_url?: string;
    country_id?: number;
    created_at?: string;
    updated_at?: string;
}

export interface Autobus {
    id: number;
    name: string;
    slug: string;
    image_url?: string;
    website_url?: string;
    country_id?: number | null;
    city_id?: number | null;
    created_at?: string;
    updated_at?: string;
}

export interface Train {
    id: number;
    name: string;
    slug: string;
    image_url?: string;
    website_url?: string;
    country_id?: number | null;
    city_id?: number | null;
    created_at?: string;
    updated_at?: string;
}

export interface Taxi {
    id: number;
    name: string;
    slug: string;
    image_url?: string;
    website_url?: string;
    country_id?: number | null;
    city_id?: number | null;
    created_at?: string;
    updated_at?: string;
}

export interface Cruise {
    id: number;
    name: string;
    slug: string;
    image_url?: string;
    website_url?: string;
    country_id?: number | null;
    created_at?: string;
    updated_at?: string;
}

export interface Banner {
    id?: number;
    name: string;
    link?: string | null;
    href?: string | null;
    button_text?: string;
    description?: string | null;
    height?: number | null;
    image?: string | null;
    sort_order?: number;

    show_name: boolean;
    show_description: boolean;
    show_overlay: boolean;
    show_button: boolean;
    content_place:
        | "top_left"
        | "top_right"
        | "top_center"
        | "center_right"
        | "bottom_right"
        | "bottom_center"
        | "bottom_left"
        | "center_left"
        | "center_center";

    created_at?: Date;
    updated_at?: Date;
}

export type CountryElement = {
    id: number;
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
    id: number;
    name?: string;
    slug?: string;
    heading?: string;
    excerpt?: string;
    content?: string;
    contacts_content?: string;
    google_map: string;
    your_location: string;
    working_time: string;
    website_link: string;
    address: string;
    phone: string;
    emergency_phone: string;
    email: string;
    fax: string;
    image_url?: string | null;
    logo?: string | null;
    right_heading_image?: string | null;
    country_id: number | null;
    city_id?: number;
    created_at?: string;
    updated_at?: string;
};

export type Landmark = {
    id: number;
    name?: string;
    slug?: string;
    heading?: string;
    excerpt?: string;
    content?: string;
    contacts_content?: string;
    google_map: string;
    your_location: string;
    working_time: string;
    tickets: string;
    phone?: string | null;
    website_link?: string | null;
    ticket_tax?: string | null;
    address?: string | null;
    image_url?: string | null;
    additional_images?: string | null;
    country_id: number | null;
    city_id?: number;
    created_at?: string;
    updated_at?: string;
};

export type Category = {
    id: number;
    parent_id?: number | null;
    name?: string;
    slug?: string;
    heading?: string;
    excerpt?: string;
    content?: string;
    image_url?: string | null;
    created_at?: string;
    updated_at?: string;
};

export type Location = {
    lat: number;
    lng: number;
};

export type Company = {
    id: number;
    name: string;
    slug: string;
    excerpt: string;
    description: string;
    image_url: string;
    offer_image_url: string;
    ads_image_url: string;
    bottom_image_url: string;
    your_location?: string;
    google_map?: string;
    company_slogan?: string;
    contacts_content?: string;
    country_id?: number | null;
    city_id?: number | null;
    category_id?: number | null;
    created_at?: Date;
    updated_at?: Date;
};