"use client";

import { useEffect, useState } from "react";
import { MdLocationPin } from "react-icons/md";
import { Embassy } from "@/lib/types";
import { googleMapsLinkToDirections } from "@/lib/utils";

type Props = {
    embassy: Embassy;
};

export default function Map({ embassy }: Props) {
    const [directionUrl, setDirectionUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const hasMap = Boolean(embassy.google_map);

    useEffect(() => {
        if (!navigator.geolocation || !embassy.your_location) {
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
                    embassy.your_location,
                    origin,
                );

                setDirectionUrl(url);
                setLoading(false);
            },
            () => {
                setLoading(false);
            },
        );
    }, [embassy.your_location]);

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
                                <span>Как да стигнете до {embassy.name}</span>
                                <MdLocationPin className="text-red-500" />
                            </h2>
                        </a>
                    )}
                </div>

                {/* MAP */}
                {hasMap ? (
                    <iframe
                        src={embassy.google_map}
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
