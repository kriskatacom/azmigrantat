import { FaLongArrowAltRight } from "react-icons/fa";
import AppImage from "@/components/AppImage";
import { Driver } from "@/lib/services/driver-service";
import { City } from "@/lib/types";

type HeroProps = {
    driver: Driver;
    fromCity: City;
    toCity: City;
};

export default function Hero({ driver, fromCity, toCity }: HeroProps) {
    return (
        <div className="relative w-full">
            <div className="relative w-full min-h-80 md:min-h-100 lg:min-h-150">
                <AppImage
                    src="/images/shared-travel/posts/car-01.webp"
                    alt="Hero background"
                    fill
                    className="object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-b from-black/30 to-black/70"></div>
            </div>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full px-4 md:px-0 text-center">
                <div className="flex justify-center items-center relative">
                    <div className="relative flex flex-col items-center">
                        <div className="relative w-20 h-20 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
                            <AppImage
                                src={fromCity.image_url as string}
                                alt={fromCity.name as string}
                                fill
                                className="object-cover"
                            />
                            <div className="absolute inset-0 flex items-start justify-center">
                                <span className="bg-black/50 text-white text-xs md:text-sm font-semibold px-2 rounded-b-md mt-5">
                                    {fromCity.name}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <FaLongArrowAltRight className="text-white w-full h-full text-4xl md:text-6xl" />
                    </div>

                    <div className="relative flex flex-col items-center">
                        <div className="relative w-20 h-20 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
                            <AppImage
                                src={toCity.image_url as string}
                                alt={toCity.name as string}
                                fill
                                className="object-cover"
                            />
                            <div className="absolute inset-0 flex items-start justify-center">
                                <span className="bg-black/50 text-white text-xs md:text-sm font-semibold px-2 rounded-b-md mt-5">
                                    {toCity.name}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="bg-website-dark text-center py-5 md:py-10 text-white text-xl md:text-3xl font-extrabold tracking-wide">
                {driver.name}
            </div>
        </div>
    );
}
