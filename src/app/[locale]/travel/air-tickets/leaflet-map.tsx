"use client";

import dynamic from "next/dynamic";
import { MapMarker } from "@/components/leaflet-map";

const LeafletMap = dynamic(() => import("@/components/leaflet-map"), {
    ssr: false,
});

interface ClientPageProps {
    markers: MapMarker[];
}

const ClientPage: React.FC<ClientPageProps> = ({ markers }) => {
    return (
        <LeafletMap
            center={{ latitude: 42.7339, longitude: 25.4858 }}
            zoom={7}
            markers={markers}
        />
    );
};

export default ClientPage;