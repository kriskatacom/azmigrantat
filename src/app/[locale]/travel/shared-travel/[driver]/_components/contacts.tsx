"use client";

import {
    FaPhoneAlt,
    FaEnvelope,
    FaViber,
    FaWhatsapp,
    FaMapMarkerAlt,
} from "react-icons/fa";
import { Driver } from "@/lib/services/driver-service";

type ContactMethod = {
    type: string;
    value: string;
};

type Props = {
    driver: Driver;
};

export default function Contacts({ driver }: Props) {
    let contactMethods: ContactMethod[] = [];

    if (driver.contact_methods) {
        try {
            const parsed =
                typeof driver.contact_methods === "string"
                    ? JSON.parse(driver.contact_methods)
                    : driver.contact_methods;

            if (Array.isArray(parsed)) {
                contactMethods = parsed;
            }
        } catch (error) {
            console.error("Invalid contact_methods JSON", error);
        }
    }

    if (!contactMethods.length) return null;

    const renderContact = (contact: ContactMethod, index: number) => {
        const { type, value } = contact;

        switch (type) {
            case "phone":
                return (
                    <li
                        key={index}
                        className="flex items-center gap-3 text-sm md:text-base"
                    >
                        <FaPhoneAlt className="text-website-dark text-lg shrink-0" />
                        <a
                            href={`tel:${value}`}
                            className="hover:text-website-dark transition-colors"
                        >
                            {value}
                        </a>
                    </li>
                );

            case "email":
                return (
                    <li
                        key={index}
                        className="flex items-center gap-3 text-sm md:text-base"
                    >
                        <FaEnvelope className="text-website-dark text-lg shrink-0" />
                        <a
                            href={`mailto:${value}`}
                            className="hover:text-website-dark transition-colors break-all"
                        >
                            {value}
                        </a>
                    </li>
                );

            case "viber":
                return (
                    <li
                        key={index}
                        className="flex items-center gap-3 text-sm md:text-base"
                    >
                        <FaViber className="text-purple-600 text-lg shrink-0" />
                        <a
                            href={`viber://chat?number=${encodeURIComponent(value)}`}
                            className="hover:text-purple-600 transition-colors"
                        >
                            Viber чат
                        </a>
                    </li>
                );

            case "whatsapp":
                return (
                    <li
                        key={index}
                        className="flex items-center gap-3 text-sm md:text-base"
                    >
                        <FaWhatsapp className="text-green-600 text-lg shrink-0" />
                        <a
                            href={`https://wa.me/${value.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-green-600 transition-colors"
                        >
                            WhatsApp съобщение
                        </a>
                    </li>
                );

            case "address":
                return (
                    <li
                        key={index}
                        className="flex items-center gap-3 text-sm md:text-base"
                    >
                        <FaMapMarkerAlt className="text-red-600 text-lg shrink-0" />
                        <span>{value}</span>
                    </li>
                );

            default:
                return null;
        }
    };

    return (
        <div className="overflow-hidden rounded-md mt-2 md:mt-5 border shadow-sm">
            <h2 className="text-white bg-website-dark text-xl lg:text-2xl font-semibold p-3 md:p-5">
                Контакти
            </h2>

            <div className="p-5">
                <ul className="space-y-5">
                    {contactMethods.map(renderContact)}
                </ul>
            </div>
        </div>
    );
}