"use client";

import { useEffect, useState } from "react";
import { MdLocationPin } from "react-icons/md";
import { googleMapsLinkToDirections } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = {
    google_map: string;
    your_location: string;
};

export default function Map({ google_map, your_location }: Props) {
    const [directionUrl, setDirectionUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const hasMap = Boolean(google_map);

    useEffect(() => {
        if (!navigator.geolocation || !your_location) {
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const origin = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                };

                const url = googleMapsLinkToDirections(
                    your_location,
                    origin,
                );

                setDirectionUrl(url);
                setLoading(false);
            },
            () => {
                setLoading(false);
            },
        );
    }, [your_location]);

    return (
        <section className="px-2 mb-2">
            <div className="bg-white p-2 w-full h-100 rounded-md overflow-hidden border">
                {/* TITLE */}
                <div className="mb-2">
                    {loading ? (
                        <div className="h-6 w-2/3 bg-gray-200 rounded animate-pulse" />
                    ) : (
                        <a
                            href={directionUrl ?? undefined}
                            target="_blank"
                            className={
                                directionUrl
                                    ? "inline-block"
                                    : "pointer-events-none"
                            }
                        >
                            <h2 className="text-xl flex items-center flex-wrap gap-1">
                                <Button variant={"default"}>
                                    <MdLocationPin className="text-red-500" />
                                    <span>Как да стигнете ?</span>
                                </Button>
                            </h2>
                        </a>
                    )}
                </div>

                {/* MAP */}
                {hasMap ? (
                    <iframe
                        src={google_map}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                    />
                ) : (
                    <div className="h-full bg-gray-100 flex items-center justify-center animate-pulse">
                        <span className="text-sm text-muted-foreground">
                            Картата не е налична
                        </span>
                    </div>
                )}
            </div>
        </section>
    );
}