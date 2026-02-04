import AppImage from "@/components/AppImage";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Advertisement() {
    return (
        <section className="relative w-full overflow-hidden" data-aos="fade-up">
            {/* Background image – full width */}
            <AppImage
                src="/images/advertisement.png"
                alt="Рекламирайте своя бизнес!"
                fill
                className="object-cover"
            />

            {/* Overlay (по желание – за по-добър контраст) */}
            <div className="absolute inset-0 bg-website-dark/40 z-0" />

            {/* Content wrapper */}
            <div className="relative z-10 w-full">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 items-center px-5 py-16 lg:py-24">
                    {/* Text block */}
                    <div
                        className="p-6 lg:p-10 rounded-xl shadow-xl text-white space-y-6 backdrop-blur-md bg-website-dark/60"
                        data-aos="fade-right"
                        data-aos-delay="200"
                    >
                        <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
                            Рекламирайте своя бизнес!
                        </h2>

                        <p className="text-lg lg:text-xl leading-relaxed">
                            Искате повече видимост за своя продукт или услуга?
                            Нашият сайт ви позволява лесно да създавате и
                            управлявате рекламни кампании, които достигат точно
                            до вашата целева аудитория. Независимо дали сте
                            малък локален бизнес или развивате онлайн търговия –
                            тук можете да представите своята марка пред реални
                            хора, които търсят това, което предлагате.
                        </p>

                        <div className="flex flex-wrap max-sm:flex-col gap-4 pt-4">
                            <Button variant={"secondary"} size={"xl"}>
                                <Link href={"/ads"} className="text-website-dark">Показване на рекламите</Link>
                            </Button>

                            <Button variant={"secondary"} size={"xl"}>
                                <Link href={"/ads"} className="text-website-dark">Рекламиране</Link>
                            </Button>
                        </div>
                    </div>

                    {/* Side image */}
                    <div
                        className="hidden lg:flex justify-end"
                        data-aos="fade-left"
                        data-aos-delay="400"
                    >
                        <AppImage
                            src="/images/advertisement.png"
                            alt="Рекламирайте своя бизнес!"
                            width={400}
                            height={500}
                            className="rounded-xl shadow-2xl transform transition duration-300 hover:scale-105"
                        />
                    </div>
                </div>
            </div>

            {/* Decorative blobs */}
            <div className="hidden lg:block absolute -top-16 -left-16 w-72 h-72 bg-linear-to-tr from-purple-500/40 to-pink-500/40 rounded-full blur-3xl animate-pulse z-0" />
            <div className="hidden lg:block absolute -bottom-16 -right-16 w-80 h-80 bg-linear-to-tr from-yellow-400/40 to-red-400/40 rounded-full blur-3xl animate-pulse z-0" />
        </section>
    );
}
