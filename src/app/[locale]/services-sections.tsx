import { getBanners } from "@/lib/services/banner-service";
import { BannerGroup } from "@/app/[locale]/admin/banners/[id]/schema";
import BannerDisplay from "@/components/banner-display";

export default async function ServicesSections() {
    const banners = await getBanners({
        where: [{ column: "group_key", value: "HOME_ELEMENTS" as BannerGroup }],
    });

    return (
        <div className="space-y-5 py-5">
            {banners.map((banner, index) => {
                return (
                    <div key={index} className="px-5">
                        <div className="overflow-hidden rounded-xl">
                            <BannerDisplay banner={banner} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
