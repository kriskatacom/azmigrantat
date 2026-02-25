"use client";

import { FaPhoneAlt, FaEnvelope, FaViber, FaWhatsapp } from "react-icons/fa";

export default function Contacts() {
    return (
        <div className="overflow-hidden rounded-md mt-2 md:mt-5 border shadow-sm">
            <h2 className="text-white bg-website-dark text-xl lg:text-2xl font-semibold p-3 md:p-5">
                Контакти
            </h2>

            <div className="p-5">
                <ul className="space-y-5">
                    {/* Телефон */}
                    <li className="flex items-center gap-3 text-sm md:text-base">
                        <FaPhoneAlt className="text-website-dark text-lg shrink-0" />
                        <a
                            href="tel:+359888123456"
                            className="hover:text-website-dark transition-colors"
                        >
                            +359 888 123 456
                        </a>
                    </li>

                    {/* Email */}
                    <li className="flex items-center gap-3 text-sm md:text-base">
                        <FaEnvelope className="text-website-dark text-lg shrink-0" />
                        <a
                            href="mailto:driver@email.com"
                            className="hover:text-website-dark transition-colors break-all"
                        >
                            driver@email.com
                        </a>
                    </li>

                    {/* Viber */}
                    <li className="flex items-center gap-3 text-sm md:text-base">
                        <FaViber className="text-purple-600 text-lg shrink-0" />
                        <a
                            href="viber://chat?number=%2B359888123456"
                            className="hover:text-purple-600 transition-colors"
                        >
                            Viber чат
                        </a>
                    </li>

                    {/* WhatsApp */}
                    <li className="flex items-center gap-3 text-sm md:text-base">
                        <FaWhatsapp className="text-green-600 text-lg shrink-0" />
                        <a
                            href="https://wa.me/359888123456"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-green-600 transition-colors"
                        >
                            WhatsApp съобщение
                        </a>
                    </li>
                </ul>
            </div>
        </div>
    );
}
