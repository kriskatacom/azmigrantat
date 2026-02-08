"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { motion, AnimatePresence } from "framer-motion";
import { FaChevronRight } from "react-icons/fa";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import AppImage from "@/components/AppImage";
import { Button } from "@/components/ui/button";
import { Coordinates } from "@/lib/types";

// Leaflet icon fix
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "/leaflet/marker-icon-2x.png",
    iconUrl: "/images/leaflet/marker-icon.png",
});

export interface MapMarker {
    id: string | number;
    coordinates: Coordinates;
    label: string;
    description?: string;
    image?: string;
    websiteUrl?: string;
}

interface LeafletMapProps {
    center: Coordinates;
    zoom?: number;
    markers?: MapMarker[];
}

/* ================= helpers ================= */

const isValidCoordinates = (coords?: Coordinates): coords is Coordinates => {
    if (!coords) return false;

    const { latitude, longitude } = coords;

    return (
        typeof latitude === "number" &&
        typeof longitude === "number" &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
    );
};

function RecenterMap({ coords }: { coords: Coordinates }) {
    const map = useMap();

    useEffect(() => {
        if (isValidCoordinates(coords)) {
            map.setView([coords.latitude, coords.longitude], map.getZoom());
        }
    }, [coords, map]);

    return null;
}

/* ================= component ================= */

const LeafletMap = ({ center, zoom = 6, markers = [] }: LeafletMapProps) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedAirport, setSelectedAirport] = useState<MapMarker | null>(
        null,
    );

    const filteredMarkers = useMemo(() => {
        return markers.filter(
            (m) =>
                m.label &&
                m.label.toLowerCase().includes(searchTerm.toLowerCase()) &&
                isValidCoordinates({
                    latitude: Number(m.coordinates.latitude),
                    longitude: Number(m.coordinates.longitude),
                }),
        );
    }, [markers, searchTerm]);

    /* body scroll lock */
    useEffect(() => {
        document.body.style.overflow = selectedAirport ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [selectedAirport]);

    return (
        <div className="relative flex h-100 md:h-175 w-full overflow-hidden rounded-xl border border-gray-200 shadow-2xl">
            {/* ================= Sidebar ================= */}
            <div className="absolute left-5 top-5 z-1000 w-100 max-h-[85%] overflow-hidden rounded-xl bg-white/95 shadow-2xl backdrop-blur-md border flex flex-col">
                <div className="border-b p-5">
                    <Input
                        type="text"
                        placeholder="Търсене на летище..."
                        value={searchTerm}
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
                            className={cn(
                                "flex cursor-pointer gap-4 rounded-lg p-3 transition hover:bg-blue-50/50",
                                selectedAirport?.id === m.id &&
                                    "bg-blue-50 shadow-sm",
                            )}
                        >
                            {m.image && (
                                <div className="min-w-30 h-30">
                                    <img
                                        src={m.image}
                                        alt={m.label}
                                        className="w-full h-full rounded-lg object-cover"
                                    />
                                </div>
                            )}

                            <div className="min-w-0">
                                <p className="font-semibold truncate">
                                    {m.label}
                                </p>

                                {m.description && (
                                    <p className="text-sm text-gray-500 line-clamp-2">
                                        {m.description.replace(/<[^>]*>/g, "")}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ================= Modal ================= */}
            <AnimatePresence>
                {selectedAirport && (
                    <motion.div
                        className="fixed inset-0 z-9999 bg-black/40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedAirport(null)}
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 30 }}
                            onClick={(e) => e.stopPropagation()}
                            className="fixed inset-0 bg-white md:inset-auto md:top-10 md:left-1/2 md:-translate-x-1/2 md:max-w-3xl md:rounded-xl"
                        >
                            {selectedAirport.image && (
                                <div className="relative h-60">
                                    <AppImage
                                        src={selectedAirport.image}
                                        fill
                                        className="object-cover"
                                        alt={selectedAirport.label}
                                    />
                                </div>
                            )}

                            <div className="p-5 text-center">
                                <h2 className="text-2xl font-bold mb-4">
                                    {selectedAirport.label}
                                </h2>

                                {selectedAirport.description && (
                                    <p className="text-gray-700 leading-relaxed">
                                        {selectedAirport.description.replace(
                                            /<[^>]*>/g,
                                            "",
                                        )}
                                    </p>
                                )}
                            </div>

                            {selectedAirport.websiteUrl && (
                                <a
                                    href={selectedAirport.websiteUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex justify-center items-center gap-2 bg-[#0a2333] py-4 text-white font-semibold"
                                >
                                    Официален сайт <FaChevronRight />
                                </a>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ================= Map ================= */}
            <MapContainer
                center={[center.latitude, center.longitude]}
                zoom={zoom}
                className="h-full w-full"
                zoomControl={false}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                />

                {selectedAirport &&
                    isValidCoordinates(selectedAirport.coordinates) && (
                        <RecenterMap coords={selectedAirport.coordinates} />
                    )}

                {filteredMarkers.map((m) => (
                    <Marker
                        key={m.id}
                        position={[
                            m.coordinates.latitude,
                            m.coordinates.longitude,
                        ]}
                        eventHandlers={{
                            click: () => setSelectedAirport(m),
                        }}
                    />
                ))}
            </MapContainer>
        </div>
    );
};

export default LeafletMap;