"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { motion, AnimatePresence } from "framer-motion";
import { FaChevronRight } from "react-icons/fa";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import AppImage from "@/components/AppImage";
import { Button } from "@/components/ui/button";

// Икони за Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "/leaflet/marker-icon-2x.png",
    iconUrl: "/images/leaflet/marker-icon.png",
});

export interface MapMarker {
    id: string | number;
    lat: number;
    lng: number;
    label: string;
    description: string;
    image: string;
    websiteUrl?: string;
}

interface LeafletMapProps {
    center: [number, number];
    zoom?: number;
    markers: MapMarker[];
}

function RecenterMap({ coords }: { coords: [number, number] }) {
    const map = useMap();
    map.setView(coords, 9);
    return null;
}

const LeafletMap = ({ center, zoom = 6, markers = [] }: LeafletMapProps) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedAirport, setSelectedAirport] = useState<MapMarker | null>(
        null,
    );

    const filteredMarkers = markers.filter((m) =>
        m.label.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    useEffect(() => {
        document.body.style.overflow = selectedAirport ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [selectedAirport]);

    useEffect(() => {
        if (selectedAirport) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }

        return () => {
            document.body.style.overflow = "";
        };
    }, [selectedAirport]);

    return (
        <div className="relative flex h-100 md:h-175 w-full overflow-hidden rounded-xl border border-gray-200 shadow-2xl">
            <div className="absolute left-5 top-5 z-1000 w-100 max-h-[85%] overflow-hidden rounded-xl bg-white/95 shadow-2xl backdrop-blur-md border border-white/20 flex flex-col">
                <div className="border-b border-gray-100 p-5">
                    <Input
                        type="text"
                        placeholder="Търсене на летище..."
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div
                    className={cn(
                        searchTerm.length === 0 ? "hidden lg:block" : "block",
                        "overflow-y-auto p-2 custom-scrollbar",
                    )}
                >
                    {filteredMarkers.map((m) => (
                        <div
                            key={m.id}
                            onClick={() => setSelectedAirport(m)}
                            className={`flex cursor-pointer items-center gap-4 rounded-lg p-3 transition-all hover:bg-blue-50/50 ${selectedAirport?.id === m.id ? "bg-blue-50 shadow-sm" : ""}`}
                        >
                            {m?.image && (
                                <div className="min-w-30 h-30">
                                    <img
                                        src={m.image}
                                        alt={m.label}
                                        width={120}
                                        height={120}
                                        className="w-full h-full rounded-lg object-cover shadow-sm"
                                    />
                                </div>
                            )}
                            <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-gray-800 text-[15px] truncate">
                                    {m.label}
                                </span>
                                <div
                                    className="text-sm text-gray-500 line-clamp-2 leading-tight"
                                    dangerouslySetInnerHTML={{
                                        __html: m.description,
                                    }}
                                ></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <AnimatePresence>
                {selectedAirport && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-9999 bg-black/40 backdrop-blur-sm"
                        onClick={() => setSelectedAirport(null)}
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 30 }}
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                                "fixed inset-0 h-dvh w-screen bg-white flex flex-col justify-between",
                                "md:inset-auto md:top-10 md:left-1/2 md:-translate-x-1/2 md:max-w-3xl md:max-h-[80vh] md:rounded-xl md:overflow-hidden",
                            )}
                        >
                            <div className="h-full overflow-y-auto">
                                <div className="relative h-60 w-full">
                                    <div className="relative h-60 w-full">
                                        <AppImage
                                            src={selectedAirport.image}
                                            fill
                                            className="object-cover"
                                            alt=""
                                        />
                                    </div>
                                    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
                                    <Button
                                        onClick={() => setSelectedAirport(null)}
                                        variant={"default"}
                                        className="absolute top-5 right-5"
                                    >
                                        ✕
                                    </Button>
                                    <h2 className="absolute bottom-4 left-0 right-0 text-center text-2xl font-bold text-white uppercase tracking-wide">
                                        {selectedAirport.label}
                                    </h2>
                                </div>

                                <div className="p-5 text-center">
                                    <div
                                        className="text-[15px] leading-relaxed text-gray-700"
                                        dangerouslySetInnerHTML={{
                                            __html: selectedAirport.description,
                                        }}
                                    ></div>
                                </div>
                            </div>

                            <a
                                href={selectedAirport.websiteUrl || "#"}
                                target="_blank"
                                className="sticky bottom-0 flex items-center justify-center gap-2 w-full bg-[#0a2333] py-4 text-center font-semibold text-white transition-colors hover:bg-[#153448]"
                            >
                                <span>Официален сайт</span>
                                <FaChevronRight />
                            </a>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <MapContainer
                center={center}
                zoom={zoom}
                className="h-full w-full z-0"
                zoomControl={false}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                />

                {selectedAirport && (
                    <RecenterMap
                        coords={[selectedAirport.lat, selectedAirport.lng]}
                    />
                )}

                {filteredMarkers.map((m) => (
                    <Marker
                        key={m.id}
                        position={[m.lat, m.lng]}
                        eventHandlers={{ click: () => setSelectedAirport(m) }}
                    />
                ))}
            </MapContainer>
        </div>
    );
};

export default LeafletMap;