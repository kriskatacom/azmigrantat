"use client";

import { useState } from "react";
import { MdLocationPin } from "react-icons/md";
import { Landmark } from "@/lib/types";
import { googleMapsLinkToDirections } from "@/lib/utils";

type Props = {
    landmark: Landmark;
};

export default function Map({ landmark }: Props) {
    const [direntionUrl, setDirectionUrl] = useState<string>();

    navigator.geolocation.getCurrentPosition((pos) => {
        const origin = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
        };

        const directionsUrl = googleMapsLinkToDirections(
            landmark.your_location,
            origin,
        );

        setDirectionUrl(directionsUrl);
    });

    return (
        <section className="px-2 mb-2">
            <div className="bg-white p-2 w-full h-100 rounded-md overflow-hidden border">
                <a href={direntionUrl} target="_blank">
                    <h2 className="text-xl mb-2 flex items-center flex-wrap">
                        <span>Как да стигнете до {landmark.name}</span>
                        <MdLocationPin className="text-red-500" />
                    </h2>
                </a>
                <iframe
                    src={landmark.google_map}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                />
            </div>
        </section>
    );
}