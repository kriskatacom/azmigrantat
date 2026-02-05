import { FaFacebook, FaTiktok } from "react-icons/fa";

export default function ContactsInfo() {
    return (
        <div className="bg-website-dark">
            <div className="container mx-auto grid xl:grid-cols-2 lg:gap-10">
                <div className="grid gap-5 p-5 md:py-10">
                    <a
                        href="tel:+35996593333"
                        className="flex max-sm:flex-col items-center gap-2 bg-website-menu-item text-white text-lg rounded-md p-5 transition hover:bg-website-menu-item/80 focus:outline-none focus:ring-2 focus:ring-white/50"
                    >
                        <i className="fa-solid fa-building text-4xl md:text-2xl"></i>
                        <span className="font-semibold">Централен офис:</span>
                        +359 96593 333
                    </a>

                    <a
                        href="tel:+359884833352"
                        className="flex max-sm:flex-col items-center gap-2 bg-website-menu-item text-white text-lg rounded-md p-5 transition hover:bg-website-menu-item/80 focus:outline-none focus:ring-2 focus:ring-white/50"
                    >
                        <i className="fa-solid fa-headset text-4xl md:text-2xl"></i>
                        <span className="font-semibold">
                            Услуги и запитвания:
                        </span>
                        +359 884 833 352
                    </a>

                    <a
                        href="tel:+359888403353"
                        className="flex max-sm:flex-col items-center gap-2 bg-website-menu-item text-white text-lg rounded-md p-5 transition hover:bg-website-menu-item/80 focus:outline-none focus:ring-2 focus:ring-white/50"
                    >
                        <i className="fa-solid fa-plane text-4xl md:text-2xl"></i>
                        <span className="font-semibold">
                            Самолетни билети и кредитиране:
                        </span>
                        +359 88 840 3353
                    </a>

                    <a
                        href="tel:+359884833351"
                        className="flex max-sm:flex-col items-center gap-2 bg-website-menu-item text-white text-lg rounded-md p-5 transition hover:bg-website-menu-item/80 focus:outline-none focus:ring-2 focus:ring-white/50"
                    >
                        <i className="fa-solid fa-shield-halved text-4xl md:text-2xl"></i>
                        <span className="font-semibold">
                            Застраховка и легализация:
                        </span>
                        +359 884 833 351
                    </a>

                    <a
                        href="tel:+31687333432"
                        className="flex max-sm:flex-col items-center gap-2 bg-website-menu-item text-white text-lg rounded-md p-5 transition hover:bg-website-menu-item/80 focus:outline-none focus:ring-2 focus:ring-white/50"
                    >
                        <i className="fa-solid fa-briefcase text-4xl md:text-2xl"></i>
                        <span className="font-semibold">
                            Работа в Нидерландия:
                        </span>
                        +31 687 333 432
                    </a>

                    <a
                        href="mailto:i.the.migrant@gmail.com"
                        className="flex max-sm:flex-col items-center gap-2 bg-website-menu-item text-white text-lg rounded-md p-5 transition hover:bg-website-menu-item/80 focus:outline-none focus:ring-2 focus:ring-white/50"
                    >
                        <i className="fa-solid fa-envelope text-4xl md:text-2xl"></i>
                        <span className="font-semibold">
                            i.the.migrant@gmail.com
                        </span>
                    </a>

                    <a
                        href="https://www.google.com/maps/search/?api=1&query=България,+гр.+Монтана,+бул.+Христо+Ботев+69"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex max-sm:flex-col items-center gap-2 bg-website-menu-item text-white text-lg rounded-md p-5 transition hover:bg-website-menu-item/80 focus:outline-none focus:ring-2 focus:ring-white/50"
                    >
                        <i className="fa-solid fa-location-dot text-4xl md:text-2xl"></i>
                        България, гр. Монтана, бул. Христо Ботев 69
                    </a>
                </div>
                <div className="flex flex-col justify-center items-center gap-5 p-5 ">
                    <h2 className="text-white text-2xl font-semibold">
                        Намерете ни в социалните мрежи
                    </h2>
                    <a
                        href="https://www.facebook.com/Ithemigrant"
                        target="__blank"
                        className="flex items-center gap-2 w-full text-2xl text-white bg-blue-500 hover:bg-blue-600 rounded-md p-5"
                    >
                        <FaFacebook size={40} />
                        <span>Facebook</span>
                    </a>
                    <a
                        href="https://www.tiktok.com/@i.the.migrantbulg"
                        target="__blank"
                        className="flex items-center gap-2 w-full text-white bg-black hover:bg-gray-900 rounded-md p-5 text-lg"
                    >
                        <FaTiktok size={40} />
                        <span>Tiktok</span>
                    </a>
                </div>
            </div>
        </div>
    );
}
