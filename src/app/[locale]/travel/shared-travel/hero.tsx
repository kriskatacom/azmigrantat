import { Banner } from "@/lib/types";
import AppImage from "@/components/AppImage";

type SharedTravelHeroProps = {
    banner: Banner;
};

export default function SharedTravelHero({ banner }: SharedTravelHeroProps) {
    return (
        <div className="relative min-h-80 md:min-h-100 lg:min-h-120 xl:min-h-150">
            <AppImage
                src={banner.image ?? "/images/fallback.png"}
                alt={banner.name ?? "Няма налична снимка"}
                className="absolute top-0 left-0 w-full h-full object-cover"
                fill
            />

            {banner.show_overlay && (
                <div className="absolute inset-0 bg-black/60"></div>
            )}

            <div className="absolute inset-0 flex flex-col justify-center items-center text-center text-white px-4">
                {banner.name && banner.show_name && (
                    <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold mb-6 drop-shadow-[0_8px_25px_rgba(0,0,0,0.9)]">
                        {banner.name}
                    </h1>
                )}

                {banner.description && banner.show_description && (
                    <p className="text-base lg:text-lg max-w-xl drop-shadow-[0_4px_15px_rgba(0,0,0,0.8)]">
                        {banner.description}
                    </p>
                )}
            </div>
        </div>
    );
}